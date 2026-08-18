/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Codemod: migrate a Kibana plugin from legacy setup/start/stop authoring to
 * native Cordis Service authoring (Stage 5).
 *
 * Usage:
 *   node scripts/migrate_plugin_to_cordis.js <pluginDirectory>
 *
 * What it transforms:
 *   - Detects `class FooPlugin implements Plugin { setup(core, plugins) {...} ... }`
 *   - Rewrites to `class FooPlugin extends Service { static inject = [...]; constructor(ctx) {...} }`
 *   - Moves setup() body into the constructor, replacing core.X accesses with ctx.get('core.X')
 *   - Wraps stop() body in ctx.effect(() => () => ...)  (skips if empty)
 *   - Replaces server/index.ts to export `cordisPlugin`
 *
 * Limitations (require manual follow-up, flagged with TODO comments):
 *   - async setup()
 *   - getStartServices() / start() with real body  → leave start() body as TODO
 *   - optionalPlugins / runtimePluginDependencies
 *   - Non-trivial constructor logic
 *   - Plugins with requiredPlugins (inject keys must be added manually)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Project, SyntaxKind } = require('ts-morph');

const OSS_LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

/** Extract the license header comment from the start of a source file, or fall back to the OSS header. */
function extractLicenseHeader(srcPath) {
  try {
    const text = fs.readFileSync(srcPath, 'utf8');
    const match = text.match(/^(\/\*[\s\S]*?\*\/)/);
    if (match) return match[1];
  } catch (_) { /* fall through */ }
  return OSS_LICENSE_HEADER;
}

// Known core.* service keys provided by the Cordis driver (Stage 4)
const CORE_SETUP_KEYS = new Set([
  'analytics', 'capabilities', 'deprecations', 'elasticsearch', 'http', 'logger',
  'logging', 'savedObjects', 'status', 'uiSettings',
]);
const CORE_START_KEYS = new Set([
  'capabilities', 'elasticsearch', 'http', 'savedObjects', 'uiSettings',
]);

function run(pluginDir) {
  const serverDir = path.join(pluginDir, 'server');
  const pluginFile = path.join(serverDir, 'plugin.ts');
  const indexFile = path.join(serverDir, 'index.ts');

  if (!fs.existsSync(pluginFile)) {
    console.error(`No server/plugin.ts found at ${pluginFile}`);
    process.exit(1);
  }

  const licenseHeader = extractLicenseHeader(pluginFile);

  const project = new Project({ addFilesFromTsConfig: false });
  const sourceFile = project.addSourceFileAtPath(pluginFile);

  // Find the plugin class: either explicitly implements Plugin/CorePlugin, or any class
  // with a setup() method (handles `class Plugin implements PluginType` alias patterns).
  let pluginClass = sourceFile.getClasses().find((cls) => {
    return cls.getImplements().some((impl) => {
      const name = impl.getExpression().getText();
      return name === 'Plugin' || name === 'CorePlugin' || name === 'PluginType';
    });
  });
  if (!pluginClass) {
    // Fallback: any class with a setup() method
    pluginClass = sourceFile.getClasses().find((cls) => cls.getMethod('setup') != null);
  }

  if (!pluginClass) {
    console.error('Could not find a class implementing Plugin in', pluginFile);
    process.exit(1);
  }

  const pluginId = deriveCordisId(pluginDir);
  const rawClassName = pluginClass.getName() || '';
  // If the class is the generic name 'Plugin', derive a proper name from the plugin ID.
  const className = (rawClassName === 'Plugin' || rawClassName === '')
    ? pluginId.charAt(0).toUpperCase() + pluginId.slice(1) + 'Plugin'
    : rawClassName;

  console.log(`Migrating ${className} → native Cordis Service (provide: '${pluginId}')`);

  // Extract lifecycle methods
  const setupMethod = pluginClass.getMethod('setup');
  const startMethod = pluginClass.getMethod('start');
  const stopMethod = pluginClass.getMethod('stop');

  const setupBody = setupMethod ? setupMethod.getBody()?.getText() ?? '{}' : '{}';
  const stopBody = stopMethod ? stopMethod.getBody()?.getText() ?? '{}' : '{}';
  const startBody = startMethod ? startMethod.getBody()?.getText() ?? '{}' : '{}';

  const hasRealStart = !isTriviallyEmpty(startBody);
  const hasRealStop = !isTriviallyEmpty(stopBody);

  // Read plugin deps from kibana.jsonc
  const allRequiredPlugins = readRequiredPlugins(pluginDir);
  const optionalPlugins = readOptionalPlugins(pluginDir);

  // Find which core services are accessed in setup body
  const coreSetupParam = setupMethod?.getParameters()[0]?.getName() ?? 'core';
  const pluginsParam = setupMethod?.getParameters()[1] ?? null;
  const pluginsSetupParam = pluginsParam?.getName() ?? 'plugins';

  const coreAccessedSetup = findCoreAccesses(setupBody, coreSetupParam, CORE_SETUP_KEYS);

  // If `core` (the CoreSetup param) is passed as an argument to an external function, bail out.
  // Pattern: identifier followed by `core` in a call argument position, e.g. `fn(core, ...)`.
  // This is distinct from `core.http.createRouter()` (method access on core).
  const corePassedToFn = new RegExp(`[,(]\\s*${escapeRegex(coreSetupParam)}\\s*[,)]`).test(setupBody);
  if (corePassedToFn) {
    console.error(`  ✗ Cannot auto-migrate: '${coreSetupParam}' is passed as an argument to an external function. Migrate manually.`);
    process.exit(1);
  }

  // Detect which plugin deps are actually used in the setup body.
  // Supports both destructured `{ dep1, dep2 }` and plain `plugins.dep1` patterns.
  const usedPluginDeps = detectUsedPluginDeps(
    setupBody, pluginsSetupParam, allRequiredPlugins
  );
  // Only inject deps that are actually used in setup (others may be browser-only)
  const requiredPlugins = allRequiredPlugins.filter((id) => usedPluginDeps.has(id));
  if (allRequiredPlugins.length > requiredPlugins.length) {
    const skipped = allRequiredPlugins.filter((id) => !usedPluginDeps.has(id));
    console.log(`  ℹ  Skipping unused server-setup deps: [${skipped.join(', ')}] (browser-only or start-only)`);
  }

  // Build inject array: core keys first, then required-plugin compat keys (.setup)
  const injectKeys = [
    ...[...coreAccessedSetup].map((prop) => `'core.${prop}'`),
    ...requiredPlugins.map((id) => `'${id}.setup'`),
  ];

  // Rewrite setup body: replace core.X with ctx.get('core.X') as any
  // Strip trailing `return ...;` since contracts are provided via `static provide`, not returned.
  let ctorBody = rewriteCoreAccesses(
    stripReturnStatements(stripBraces(setupBody)),
    coreSetupParam,
    coreAccessedSetup
  );

  // If the plugins param is a plain identifier (not destructured) and is used in the body
  // but all its deps were filtered out (browser-only), the variable would be undefined.
  // Bail out in that case — the whole plugins object is being passed to an external function.
  const isDestructuredPluginsParam = pluginsSetupParam.startsWith('{');
  if (!isDestructuredPluginsParam && requiredPlugins.length === 0 && allRequiredPlugins.length > 0) {
    const pluginsParamUsed = new RegExp(`\\b${escapeRegex(pluginsSetupParam)}\\b`).test(setupBody);
    if (pluginsParamUsed) {
      console.error(`  ✗ Cannot auto-migrate: plugins param '${pluginsSetupParam}' is used as a whole object but all deps were filtered as browser-only. Migrate manually.`);
      process.exit(1);
    }
  }

  // Inject required-plugin compat keys: rebuild `plugins` (or destructured param) from ctx.
  // For destructured patterns like `{ dep1, dep2 }`, emit individual const declarations.
  if (requiredPlugins.length > 0) {
    const destructuredMatch = pluginsSetupParam.match(/^\{([^}]+)\}/);
    let pluginsDecl;
    if (destructuredMatch) {
      // Destructured: emit `const dep1 = (ctx.get('dep1.setup') as any).contract;` per dep
      pluginsDecl = requiredPlugins
        .map((id) => `const ${id} = (ctx.get('${id}.setup') as any).contract;`)
        .join('\n');
    } else {
      // Plain: emit `const plugins = { dep1: ..., dep2: ... };`
      const pluginEntries = requiredPlugins
        .map((id) => `  ${id}: (ctx.get('${id}.setup') as any).contract,`)
        .join('\n');
      pluginsDecl = `const ${pluginsSetupParam} = {\n${pluginEntries}\n};`;
    }
    ctorBody = pluginsDecl + '\n' + ctorBody;
  }
  if (optionalPlugins.length > 0) {
    console.log(
      `  ⚠  optionalPlugins [${optionalPlugins.join(', ')}] are not auto-migrated. Add them manually.`
    );
  }

  // Build stop wiring
  const stopSection = hasRealStop
    ? `\n    // Migrated from stop():\n    ctx.effect(() => () => {\n      ${stripBraces(stopBody)}\n    });`
    : '';

  const startTodo = hasRealStart
    ? '\n    // TODO: start() had a non-empty body — migrate manually:\n' +
      startBody.split('\n').map((l) => `    // ${l}`).join('\n')
    : '';

  // Rewrite logger references: this.logger, this.log, this.#logger, this.#log
  const loggerReplacement = `(ctx.get('core.logger') as any).get('plugins', '${pluginId}')`;
  const hasThisLogger = /this\.(?:#logger|#log|logger|log)\b/.test(ctorBody + stopSection);
  ctorBody = ctorBody
    .replace(/this\.#logger\b/g, loggerReplacement)
    .replace(/this\.#log\b/g, loggerReplacement)
    .replace(/this\.logger\b/g, loggerReplacement)
    .replace(/this\.log\b/g, loggerReplacement);
  // If logger was rewritten, inject core.logger unless already injected via core.logger access
  if (hasThisLogger && !coreAccessedSetup.has('logger')) {
    injectKeys.unshift("'core.logger'");
  }

  // Keep non-core imports (drop PluginInitializerContext, CoreSetup, CoreStart, Plugin etc.)
  const CORE_LIFECYCLE_PATTERN =
    /PluginInitializerContext|CoreSetup|CoreStart|Plugin\b|PrebootPlugin|Logger\b/;
  // We'll check if imported names are referenced in the active (non-TODO) constructor body.
  // startTodo is commented-out code — imports that appear only there should be removed.
  const newBodyText = ctorBody + stopSection;
  const originalImports = sourceFile
    .getImportDeclarations()
    .filter((imp) => {
      const mod = imp.getModuleSpecifierValue();
      // Drop meta-package core imports that only carry lifecycle types
      if (mod === '@kbn/core/server' || mod === '@kbn/core-lifecycle-server' || mod === '@kbn/core-plugins-server') {
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        return namedImports.some((n) => !CORE_LIFECYCLE_PATTERN.test(n));
      }
      // Drop any import (value or type) if ALL named imports are absent from the active body.
      // This catches imports that were only used in start() body (now in a commented-out TODO).
      if (hasRealStart) {
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        if (namedImports.length > 0) {
          const anyUsedInBody = namedImports.some((n) => newBodyText.includes(n));
          const allInStart = namedImports.every((n) => startBody.includes(n));
          if (!anyUsedInBody && allInStart) return false;
        }
      }
      // For type-only imports, drop if no named imports appear in the active body.
      if (imp.isTypeOnly()) {
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        const anyUsed = namedImports.some((n) => newBodyText.includes(n));
        return anyUsed;
      }
      return true;
    })
    .map((imp) => imp.getText())
    .join('\n');

  // Indent constructor body: normalize to 4-space indent (strip common prefix, re-add 4 spaces)
  const indentedCtorBody = reindent(ctorBody, 4);
  const indentedStop = reindent(stopSection, 4);

  // Collect non-import, non-class top-level declarations used in the constructor body.
  // These include interface declarations, type aliases, and const declarations that may be
  // referenced in the setup/stop bodies but are defined in the file (not imported).
  // Collect module-level declarations (interface/type/enum/const/let/var) that are referenced
  // in the constructor body (or transitively by another preserved declaration).
  const allStatements = sourceFile.getStatements();
  const getStmtName = (stmt) => {
    const kind = stmt.getKindName();
    const text = stmt.getText();
    if (['InterfaceDeclaration', 'TypeAliasDeclaration', 'EnumDeclaration'].includes(kind)) {
      const m = text.match(/(?:interface|type|enum)\s+(\w+)/);
      return m ? m[1] : null;
    }
    if (kind === 'VariableStatement') {
      // May declare multiple variables; return array of names by calling recursively per name
      return [...text.matchAll(/\b(?:const|let|var)\s+(\w+)/g)].map(([, n]) => n).join(',') || null;
    }
    return null;
  };

  // Fixed-point: start with newBodyText, expand with text of preserved stmts
  let searchText = newBodyText;
  const preserved = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const stmt of allStatements) {
      if (preserved.has(stmt)) continue;
      const nameStr = getStmtName(stmt);
      if (!nameStr) continue;
      const names = nameStr.split(',').filter(Boolean);
      const referenced = names.some((name) => new RegExp(`\\b${escapeRegex(name)}\\b`).test(searchText));
      if (referenced) {
        preserved.add(stmt);
        searchText += '\n' + stmt.getText();
        changed = true;
      }
    }
  }
  // Output in source order (allStatements preserves file order)
  const otherDeclarations = allStatements.filter((s) => preserved.has(s)).map((stmt) => stmt.getText()).join('\n\n');
  const otherDeclsSection = otherDeclarations ? '\n' + otherDeclarations + '\n' : '';

  // Build the new file content
  const newClassBody = `// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ${className} extends Service {
  static readonly inject${injectKeys.length === 0 ? ': string[]' : ''} = [${injectKeys.join(', ')}];
  static readonly provide = '${pluginId}';

  constructor(ctx: Context) {
    super(ctx, '${pluginId}');
${indentedCtorBody}${indentedStop}${startTodo}
  }
}`;

  const finalContent = [
    licenseHeader,
    '',
    "import { Service } from '@kbn/cordis';",
    "import type { Context } from '@kbn/cordis';",
    originalImports,
    otherDeclsSection,
    newClassBody,
    '',
  ].join('\n');

  fs.writeFileSync(pluginFile, finalContent, 'utf8');
  console.log(`  ✓ Rewrote ${pluginFile}`);

  // Rewrite server/index.ts — preserve its existing license header and any non-plugin re-exports.
  // Drop the `export const plugin = ...` / `export async function plugin() {...}` initializer;
  // keep `export type { ... } from '...'` and similar module re-exports.
  const indexLicenseHeader = extractLicenseHeader(indexFile);
  let existingIndexReexports = '';
  if (fs.existsSync(indexFile)) {
    const indexText = fs.readFileSync(indexFile, 'utf8');
    // Strip the entire plugin() initializer block (may be multi-line).
    // Handles: `export const plugin = async () => { ... };`
    //          `export async function plugin() { ... }`
    const stripped = indexText
      .replace(/export\s+(?:async\s+function\s+plugin\s*\([^)]*\)|const\s+plugin\s*[=:][^;{]*)\s*\{[^}]*\}(?:\s*;)?/gs, '');
    // Build a map: name → source module from `import type { ... } from '...'` statements (multiline-safe).
    const importedFrom = {};
    const importTypeRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"])/gs;
    for (const m of indexText.matchAll(importTypeRegex)) {
      const src = m[2];
      for (const rawName of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        // Handle aliased: "Foo as Bar" — key is the original name Foo
        const baseName = rawName.split(/\s+as\s+/)[0].trim();
        importedFrom[baseName] = src;
      }
    }

    // Extract all complete export { ... } and export type { ... } statements (including multiline).
    // This regex captures: export [type] { ... } [from '...'];
    const reexports = [];
    const exportRegex = /export\s+(?:type\s+)?\{[^}]*\}(?:\s+from\s+['"][^'"]+['"])?\s*;/gs;
    for (const match of stripped.matchAll(exportRegex)) {
      const stmt = match[0].replace(/\s+/g, ' ').trim();
      const hasFrom = /from\s+['"]/.test(stmt);
      const isFromPlugin = /from\s+['"]\.\/plugin['"]/.test(stmt);
      if (isFromPlugin) continue;

      if (hasFrom) {
        // Keep as-is (already has from clause, not ./plugin).
        reexports.push(stmt);
      } else if (/^export\s+type\s+\{/.test(stmt)) {
        // Bare re-export: resolve each name to its source module.
        const namesMatch = stmt.match(/export\s+type\s+\{([^}]+)\}/);
        if (namesMatch) {
          const names = namesMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
          const bySource = {};
          const unresolved = [];
          for (const name of names) {
            // Handle aliased names like "Foo as Bar"
            const baseName = name.split(/\s+as\s+/)[0].trim();
            if (importedFrom[baseName]) {
              (bySource[importedFrom[baseName]] = bySource[importedFrom[baseName]] || []).push(name);
            } else {
              unresolved.push(name);
            }
          }
          for (const [src, srcNames] of Object.entries(bySource)) {
            reexports.push(`export type { ${srcNames.join(', ')} } from ${src};`);
          }
          if (unresolved.length > 0) {
            reexports.push(`export type { ${unresolved.join(', ')} };`);
          }
        }
      }
      // Non-type bare export { ... } without from — skip (likely re-exports of imports that won't work)
    }
    if (reexports.length > 0) existingIndexReexports = '\n' + reexports.join('\n');
  }
  const newIndex = `${indexLicenseHeader}

export { default as cordisPlugin } from './plugin';${existingIndexReexports}
`;
  fs.writeFileSync(indexFile, newIndex, 'utf8');
  console.log(`  ✓ Rewrote ${indexFile}`);

  if (hasRealStart) {
    console.log(
      `  ⚠  start() had a non-empty body — a TODO comment was added; migrate manually.`
    );
  }
  if (hasRealStop) {
    console.log(`  ✓ stop() body wrapped in ctx.effect().`);
  }

  console.log('\nDone. Run type-check and tests to verify:');
  console.log(`  node scripts/type_check --project ${serverDir}/../tsconfig.json`);
}

/** Parse a JSONC string (handles // comments and trailing commas). */
function parseJsonc(text) {
  const stripped = text
    .replace(/\/\/[^\n]*/g, '')           // strip // comments
    .replace(/\/\*[\s\S]*?\*\//g, '')     // strip /* */ block comments
    .replace(/,(\s*[}\]])/g, '$1');       // strip trailing commas before } or ]
  return JSON.parse(stripped);
}

function readKibanajsonc(pluginDir) {
  try {
    const text = fs.readFileSync(path.join(pluginDir, 'kibana.jsonc'), 'utf8');
    return parseJsonc(text);
  } catch (_) { return {}; }
}

/** Read requiredPlugins array from kibana.jsonc. */
function readRequiredPlugins(pluginDir) {
  return readKibanajsonc(pluginDir).plugin?.requiredPlugins ?? [];
}

/** Read optionalPlugins array from kibana.jsonc. */
function readOptionalPlugins(pluginDir) {
  return readKibanajsonc(pluginDir).plugin?.optionalPlugins ?? [];
}

/** Read the plugin ID from kibana.jsonc (plugin.id field). Falls back to camelCase of dir name. */
function deriveCordisId(pluginDir) {
  const id = readKibanajsonc(pluginDir).plugin?.id;
  if (id) return id;
  const base = path.basename(pluginDir);
  return base.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

/**
 * Detect which plugin IDs from `allPlugins` are actually used in the setup body.
 * Handles both:
 *   - Plain param: `plugins.contentManagement.registerType(...)`
 *   - Destructured param: `{ contentManagement }: SetupDeps`  (binding names in param)
 */
function detectUsedPluginDeps(bodyText, pluginsParamName, allPlugins) {
  const used = new Set();
  // Destructured pattern: pluginsParamName is like `{ dep1, dep2 }` or `{ dep1: alias, dep2 }`
  const destructuredMatch = pluginsParamName.match(/^\{([^}]+)\}/);
  if (destructuredMatch) {
    // Parse the binding names from the destructuring pattern
    const bindings = destructuredMatch[1].split(',').map((b) => {
      // Each binding is like `dep1` or `dep1: localName`
      return b.trim().split(':')[0].trim().replace(/\s*=\s*.*$/, '');
    });
    for (const id of allPlugins) {
      // Must be in the destructuring AND actually referenced in the method body text.
      // (A dep that is destructured but never used in the body should not be injected.)
      if (bindings.includes(id) && new RegExp(`\\b${escapeRegex(id)}\\b`).test(bodyText)) {
        used.add(id);
      }
    }
  } else {
    // Plain identifier: look for `pluginsParamName.X` accesses
    for (const id of allPlugins) {
      const re = new RegExp(`\\b${escapeRegex(pluginsParamName)}\\.${escapeRegex(id)}\\b`);
      if (re.test(bodyText)) used.add(id);
    }
  }
  return used;
}

/** Return set of core property names accessed as `${param}.X` in the body text. */
function findCoreAccesses(bodyText, coreParam, allowedKeys) {
  const accessed = new Set();
  const re = new RegExp(`\\b${escapeRegex(coreParam)}\\.([a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');
  let m;
  while ((m = re.exec(bodyText)) !== null) {
    if (allowedKeys.has(m[1])) {
      accessed.add(m[1]);
    }
  }
  return accessed;
}

/** Replace `${coreParam}.X.method(...)` with `(ctx.get('core.X') as any).method(...)` in body. */
function rewriteCoreAccesses(bodyText, coreParam, coreProps) {
  let result = bodyText;
  for (const prop of coreProps) {
    const re = new RegExp(`\\b${escapeRegex(coreParam)}\\.${escapeRegex(prop)}\\b`, 'g');
    result = result.replace(re, `(ctx.get('core.${prop}') as any)`);
  }
  return result;
}

/** Strip leading `{` and trailing `}` from a method body string. */
function stripBraces(body) {
  return body.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
}

/**
 * Normalize indentation: strip the common leading whitespace from all non-empty lines,
 * then re-indent with `targetSpaces` spaces.
 */
function reindent(text, targetSpaces) {
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return text;
  const minIndent = nonEmpty.reduce((min, l) => {
    const m = l.match(/^(\s*)/);
    return Math.min(min, m ? m[1].length : 0);
  }, Infinity);
  const prefix = ' '.repeat(targetSpaces);
  return lines
    .map((l) => (l.trim() ? prefix + l.slice(minIndent) : ''))
    .join('\n');
}

/** Return true if a method body is effectively empty (no real statements). */
function isTriviallyEmpty(body) {
  const inner = stripBraces(body);
  // Allow empty, whitespace-only, and sole `return {};` / `return undefined;` / `return;`
  return inner.trim() === '' || /^return\s*({}|undefined|void 0)?;?\s*$/.test(inner.trim());
}

/**
 * Strip trailing `return ...;` statements from a method body (already stripped of outer braces).
 * setup() returns a contract object; in native Cordis that role is filled by `static provide`.
 */
function stripReturnStatements(body) {
  // Remove lines that are purely `return ...;` at the end of the body.
  return body.replace(/\n?\s*return\s+[^;]*;\s*$/s, '').trimEnd();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [, , pluginDir] = process.argv;
if (!pluginDir) {
  console.error('Usage: node scripts/migrate_plugin_to_cordis.js <pluginDirectory>');
  process.exit(1);
}

run(path.resolve(pluginDir));
