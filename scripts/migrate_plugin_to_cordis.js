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

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

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

  const hasRealStart = startBody.trim() !== '{}' && startBody.trim() !== '{ }';
  const hasRealStop = stopBody.trim() !== '{}' && stopBody.trim() !== '{ }';

  // Find which core services are accessed in setup body
  const coreSetupParam = setupMethod?.getParameters()[0]?.getName() ?? 'core';
  const pluginsSetupParam = setupMethod?.getParameters()[1]?.getName() ?? 'plugins';

  const coreAccessedSetup = findCoreAccesses(setupBody, coreSetupParam, CORE_SETUP_KEYS);

  // Build inject array
  const injectKeys = [...coreAccessedSetup].map((prop) => `'core.${prop}'`);

  // Rewrite setup body: replace core.X with ctx.get('core.X') as any
  let ctorBody = rewriteCoreAccesses(stripBraces(setupBody), coreSetupParam, coreAccessedSetup);

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
  const originalImports = sourceFile
    .getImportDeclarations()
    .filter((imp) => {
      const mod = imp.getModuleSpecifierValue();
      const text = imp.getText();
      // Drop meta-package core imports that only carry lifecycle types
      if (mod === '@kbn/core/server' || mod === '@kbn/core-lifecycle-server' || mod === '@kbn/core-plugins-server') {
        // Check if ALL named imports are lifecycle-only; keep if not
        const namedImports = imp.getNamedImports().map((ni) => ni.getName());
        return namedImports.some((n) => !CORE_LIFECYCLE_PATTERN.test(n));
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

  constructor(ctx: Context, _config: never) {
    super(ctx, '${pluginId}');
${indentedCtorBody}${indentedStop}${startTodo}
  }
}`;

  const finalContent = [
    LICENSE_HEADER,
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

  // Rewrite server/index.ts
  const newIndex = `${LICENSE_HEADER}

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
