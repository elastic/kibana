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
  'capabilities', 'deprecations', 'elasticsearch', 'http', 'logger',
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

  // Find the plugin class
  const pluginClass = sourceFile.getClasses().find((cls) => {
    return cls.getImplements().some((impl) => {
      const name = impl.getExpression().getText();
      return name === 'Plugin' || name === 'CorePlugin';
    });
  });

  if (!pluginClass) {
    console.error('Could not find a class implementing Plugin in', pluginFile);
    process.exit(1);
  }

  const className = pluginClass.getName();
  const pluginId = deriveCordisId(pluginDir);

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

  // Rewrite logger references from initializerContext.logger.get() pattern
  ctorBody = ctorBody
    .replace(/this\.logger\b/g, '(ctx.get(\'core.logger\') as any).get(\'plugins\', \'__PLUGIN_ID__\')')
    .replace(/__PLUGIN_ID__/g, pluginId);

  // Build stop wiring
  const stopSection = hasRealStop
    ? `\n    // Migrated from stop():\n    ctx.effect(() => () => {\n      ${stripBraces(stopBody)}\n    });`
    : '';

  const startTodo = hasRealStart
    ? `\n    // TODO: start() had a non-empty body — migrate manually:\n    // ${startBody}`
    : '';

  // Keep non-core imports (drop PluginInitializerContext, CoreSetup, CoreStart, Plugin etc.)
  const CORE_LIFECYCLE_PATTERN =
    /PluginInitializerContext|CoreSetup|CoreStart|Plugin\b|PrebootPlugin|Logger\b/;
  // Types from SetupDeps / StartDeps interfaces are no longer used in the migrated code
  const UNUSED_TYPE_PATTERN = /SetupDeps|StartDeps/;
  const originalImports = sourceFile
    .getImportDeclarations()
    .filter((imp) => {
      const mod = imp.getModuleSpecifierValue();
      // Drop meta-package core imports that only carry lifecycle types
      if (mod === '@kbn/core/server' || mod === '@kbn/core-lifecycle-server' || mod === '@kbn/core-plugins-server') {
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        return namedImports.some((n) => !CORE_LIFECYCLE_PATTERN.test(n));
      }
      // Drop type-only imports where ALL named imports are now unused (SetupDeps, StartDeps, etc.)
      if (imp.isTypeOnly()) {
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        if (namedImports.every((n) => UNUSED_TYPE_PATTERN.test(n))) return false;
      }
      return true;
    })
    .map((imp) => imp.getText())
    .join('\n');

  // Indent constructor body
  const indentedCtorBody = ctorBody
    .split('\n')
    .map((line) => (line.trim() ? `    ${line.trim()}` : ''))
    .join('\n');

  const indentedStop = stopSection
    .split('\n')
    .map((line) => (line.trim() ? `    ${line.trim()}` : ''))
    .join('\n');

  // Build the new file content
  const newClassBody = `// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ${className} extends Service {
  static readonly inject = [${injectKeys.join(', ')}];
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
    '',
    newClassBody,
    '',
  ].join('\n');

  fs.writeFileSync(pluginFile, finalContent, 'utf8');
  console.log(`  ✓ Rewrote ${pluginFile}`);

  // Rewrite server/index.ts — preserve its existing license header if present
  const indexLicenseHeader = extractLicenseHeader(indexFile);
  const newIndex = `${indexLicenseHeader}

export { default as cordisPlugin } from './plugin';
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

/** Read requiredPlugins array from kibana.jsonc. */
function readRequiredPlugins(pluginDir) {
  try {
    const jsonc = fs.readFileSync(path.join(pluginDir, 'kibana.jsonc'), 'utf8');
    const stripped = jsonc.replace(/\/\/[^\n]*/g, '');
    const parsed = JSON.parse(stripped);
    return parsed.plugin?.requiredPlugins ?? [];
  } catch (_) { return []; }
}

/** Read optionalPlugins array from kibana.jsonc. */
function readOptionalPlugins(pluginDir) {
  try {
    const jsonc = fs.readFileSync(path.join(pluginDir, 'kibana.jsonc'), 'utf8');
    const stripped = jsonc.replace(/\/\/[^\n]*/g, '');
    const parsed = JSON.parse(stripped);
    return parsed.plugin?.optionalPlugins ?? [];
  } catch (_) { return []; }
}

/** Read the plugin ID from kibana.jsonc (plugin.id field). Falls back to camelCase of dir name. */
function deriveCordisId(pluginDir) {
  try {
    const jsonc = fs.readFileSync(path.join(pluginDir, 'kibana.jsonc'), 'utf8');
    const stripped = jsonc.replace(/\/\/[^\n]*/g, '');
    const parsed = JSON.parse(stripped);
    if (parsed.plugin?.id) return parsed.plugin.id;
  } catch (_) { /* fall through */ }
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
      if (bindings.includes(id)) used.add(id);
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
