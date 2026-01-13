/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import globby from 'globby';
import * as yaml from 'js-yaml';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';

interface ConfigEntry {
  type: string;
  path: string;
  description?: string;
  deprecated?: boolean;
}

interface ConfigTree {
  [key: string]: ConfigTree | string;
}

interface PluginManifest {
  id: string;
  plugin?: {
    id: string;
    configPath?: string | string[];
  };
  configPath?: string | string[];
}

/**
 * Parse a kibana.jsonc file to extract plugin metadata
 */
function parsePluginManifest(manifestPath: string): PluginManifest | null {
  try {
    const content = Fs.readFileSync(manifestPath, 'utf-8');
    // Remove comments from JSONC
    const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(jsonContent);
  } catch (e) {
    return null;
  }
}

/**
 * Convert config path array or string to dot notation
 */
function configPathToString(configPath: string | string[] | undefined, pluginId: string): string {
  if (!configPath) {
    // Default: convert camelCase id to snake_case
    return pluginId
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
  if (Array.isArray(configPath)) {
    return configPath.join('.');
  }
  return configPath;
}

interface SchemaWithMeta {
  path: string[];
  type: string;
  description?: string;
  deprecated?: boolean;
}

/**
 * Recursively extract schema entries with metadata (descriptions, deprecated flags)
 */
function extractSchemaWithMeta(internalSchema: any, path: string[] = []): SchemaWithMeta[] {
  const entries: SchemaWithMeta[] = [];

  // Check if this schema has child keys (object type)
  const byKey = internalSchema?._ids?._byKey;
  if (byKey && byKey.size > 0) {
    for (const [key, val] of byKey.entries()) {
      entries.push(...extractSchemaWithMeta(val.schema, [...path, key]));
    }
  }

  // If no children, this is a leaf node
  if (entries.length === 0) {
    const description =
      internalSchema?._flags?.description || internalSchema?.describe?.()?.flags?.description;
    const metas = internalSchema?.$_terms?.metas || internalSchema?.describe?.()?.metas || [];
    const deprecated = metas.some((m: any) => m?.['x-oas-deprecated'] === true);

    // Get the type string
    let type = internalSchema?.type || 'unknown';

    // Try to get more specific type info for alternatives (oneOf)
    if (type === 'alternatives' && internalSchema?.$_terms?.matches) {
      const options = internalSchema.$_terms.matches
        .map((m: any) => {
          const s = m.schema;
          if (s?._flags?.only && s?._valids?._values?.size > 0) {
            // It's a literal
            return [...s._valids._values.keys()].map(String).join('|');
          }
          return s?.type || 'unknown';
        })
        .filter(Boolean);
      if (options.length > 0) {
        type = options.join('|');
      }
    }

    // Check for literal values
    if (internalSchema?._flags?.only && internalSchema?._valids?._values?.size > 0) {
      const literals = [...internalSchema._valids._values.keys()].map(String);
      type = `literal(${literals.join('|')})`;
    }

    entries.push({
      path,
      type,
      ...(description && { description }),
      ...(deprecated && { deprecated }),
    });
  }

  return entries;
}

interface CoreConfigResult {
  configPath: string;
  schemaStructure: SchemaWithMeta[];
}

/**
 * Try to load a core config file and extract both the config path and schema
 */
function loadCoreConfigFromFile(filePath: string): CoreConfigResult | null {
  try {
    // Use require() for TypeScript files - needed for babel-register transpilation
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(filePath);

    // Core configs typically export a config object with { path, schema } structure
    // Try different export patterns
    const configExports = [
      module.config,
      module.coreConfig,
      module.statusConfig,
      module.serverlessConfig,
      module.elasticApmConfig,
      module.pricingConfig,
      module.opsConfig,
      module.nodeConfig,
      module.cspConfig,
      module.pidConfig,
      module.savedObjectsMigrationConfig,
      module.default,
    ].filter(Boolean);

    for (const configExport of configExports) {
      // Check if this export has the { path, schema } structure
      if (configExport?.path && configExport?.schema?.getSchema) {
        const configPath =
          typeof configExport.path === 'string' ? configExport.path : String(configExport.path);
        const internalSchema = configExport.schema.getSchema();
        const schemaStructure = extractSchemaWithMeta(internalSchema);

        if (schemaStructure.length > 0) {
          return { configPath, schemaStructure };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try to load a schema from a config file using runtime introspection
 */
function loadSchemaFromFile(filePath: string): SchemaWithMeta[] | null {
  try {
    // Use require() for TypeScript files - needed for babel-register transpilation

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(filePath);

    // Try different export patterns to find the schema
    let schema = null;

    if (module.configSchema?.getSchema) {
      schema = module.configSchema;
    } else if (module.config?.schema?.getSchema) {
      schema = module.config.schema;
    } else if (module.config?.getSchema) {
      schema = module.config;
    } else if (module.default?.schema?.getSchema) {
      schema = module.default.schema;
    } else if (module.default?.getSchema) {
      schema = module.default;
    }

    if (schema) {
      // Get the internal Joi schema and extract with metadata
      const internalSchema = schema.getSchema();
      return extractSchemaWithMeta(internalSchema);
    }

    return null;
  } catch (e) {
    // File couldn't be loaded - might have unresolved dependencies
    return null;
  }
}

/**
 * Format a config entry for display
 */
function formatConfigEntry(entry: ConfigEntry): string {
  let result = entry.type;
  if (entry.deprecated) {
    result = `[DEPRECATED] ${result}`;
  }
  if (entry.description) {
    result = `${result} # ${entry.description}`;
  }
  return result;
}

/**
 * Build a nested object structure from flat config entries
 */
function buildNestedConfig(entries: ConfigEntry[]): ConfigTree {
  const nested: ConfigTree = {};

  // Sort entries by path for consistent output
  const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sortedEntries) {
    const parts = entry.path.split('.');
    let current = nested;

    // Navigate/create the path to the parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      } else if (typeof current[part] === 'string') {
        // Parent is already a leaf value, convert to object with _self
        const oldValue = current[part] as string;
        current[part] = { _self: oldValue };
      }

      if (typeof current[part] !== 'object' || current[part] === null) {
        break;
      }
      current = current[part] as ConfigTree;
    }

    const lastPart = parts[parts.length - 1];
    const formattedValue = formatConfigEntry(entry);

    // Check if the target already exists as an object (has children)
    if (lastPart in current && typeof current[lastPart] === 'object') {
      (current[lastPart] as ConfigTree)._self = formattedValue;
    } else {
      current[lastPart] = formattedValue;
    }
  }

  return nested;
}

run(
  async ({ log, flagsReader }) => {
    const outputPath = flagsReader.string('output');
    const verbose = flagsReader.boolean('verbose');

    log.info('Scanning Kibana codebase for configuration options...');

    // Find all plugin manifests
    const manifestPaths = await globby(
      [
        'src/platform/plugins/**/kibana.jsonc',
        'x-pack/platform/plugins/**/kibana.jsonc',
        'x-pack/solutions/**/kibana.jsonc',
        'src/plugins/**/kibana.jsonc',
        'x-pack/plugins/**/kibana.jsonc',
      ],
      {
        cwd: REPO_ROOT,
        absolute: true,
        ignore: ['**/node_modules/**'],
      }
    );

    log.info(`Found ${manifestPaths.length} plugin manifests`);

    const allConfigs: ConfigEntry[] = [];
    let loadedCount = 0;
    let failedCount = 0;

    // Process each plugin manifest
    for (const manifestPath of manifestPaths) {
      const manifest = parsePluginManifest(manifestPath);
      if (!manifest) continue;

      // Get the plugin ID and configPath from the nested plugin object
      const pluginId =
        manifest.plugin?.id || manifest.id.replace('@kbn/', '').replace('-plugin', '');
      const rawConfigPath = manifest.plugin?.configPath || manifest.configPath;
      const configPath = configPathToString(rawConfigPath, pluginId);

      // Find the config file
      const pluginDir = Path.dirname(manifestPath);
      const possibleConfigFiles = [
        Path.join(pluginDir, 'server', 'config.ts'),
        Path.join(pluginDir, 'common', 'config.ts'),
        Path.join(pluginDir, 'server', 'index.ts'),
        Path.join(pluginDir, 'server', 'config_schema.ts'),
        Path.join(pluginDir, 'common', 'config_schema.ts'),
      ];

      let configFile: string | null = null;
      for (const possible of possibleConfigFiles) {
        if (Fs.existsSync(possible)) {
          configFile = possible;
          break;
        }
      }

      if (configFile) {
        if (verbose) {
          log.debug(`Processing ${pluginId} (${configPath}) from ${configFile}`);
        }

        const schemaStructure = loadSchemaFromFile(configFile);

        if (schemaStructure && schemaStructure.length > 0) {
          loadedCount++;

          for (const entry of schemaStructure) {
            const fullPath =
              entry.path.length > 0 ? `${configPath}.${entry.path.join('.')}` : configPath;

            allConfigs.push({
              path: fullPath,
              type: entry.type,
              ...(entry.description && { description: entry.description }),
              ...(entry.deprecated && { deprecated: entry.deprecated }),
            });
          }
        } else {
          failedCount++;
          if (verbose) {
            log.debug(`  Could not load schema from ${configFile}`);
          }

          // Add default enabled option as fallback
          allConfigs.push({
            path: `${configPath}.enabled`,
            type: 'boolean (default: true)',
          });
        }
      } else {
        // No config file found, add default enabled option
        allConfigs.push({
          path: `${configPath}.enabled`,
          type: 'boolean (default: true)',
        });
      }
    }

    // Dynamically discover core config files by searching for files that import @kbn/config-schema
    const coreConfigFiles = await globby(['src/core/packages/**/*config*.ts'], {
      cwd: REPO_ROOT,
      absolute: true,
      ignore: ['**/*.test.ts', '**/*.mock.ts', '**/test_helpers/**', '**/mocks/**'],
    });

    // Filter to only files that actually import from @kbn/config-schema
    const validCoreConfigFiles: string[] = [];
    for (const file of coreConfigFiles) {
      try {
        const content = Fs.readFileSync(file, 'utf-8');
        if (content.includes("from '@kbn/config-schema'")) {
          validCoreConfigFiles.push(file);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    log.info(`Found ${validCoreConfigFiles.length} core config files with @kbn/config-schema`);
    let coreLoadedCount = 0;

    for (const file of validCoreConfigFiles) {
      if (verbose) {
        log.debug(`Processing core config file: ${file}`);
      }

      // Try to load the schema and extract the config path from the exported config
      const configInfo = loadCoreConfigFromFile(file);

      if (configInfo && configInfo.schemaStructure.length > 0) {
        coreLoadedCount++;

        for (const entry of configInfo.schemaStructure) {
          const fullPath =
            entry.path.length > 0
              ? `${configInfo.configPath}.${entry.path.join('.')}`
              : configInfo.configPath;

          // Avoid duplicates
          if (!allConfigs.some((c) => c.path === fullPath)) {
            allConfigs.push({
              path: fullPath,
              type: entry.type,
              ...(entry.description && { description: entry.description }),
              ...(entry.deprecated && { deprecated: entry.deprecated }),
            });
          }
        }

        if (verbose) {
          log.debug(
            `  Loaded ${configInfo.schemaStructure.length} options from ${configInfo.configPath}`
          );
        }
      } else if (verbose) {
        log.debug(`  Could not extract config from: ${file}`);
      }
    }

    log.info(`Successfully loaded schemas from ${coreLoadedCount} core config files`);

    // Sort and deduplicate
    const uniqueConfigs = Array.from(new Map(allConfigs.map((c) => [c.path, c])).values()).sort(
      (a, b) => a.path.localeCompare(b.path)
    );

    // Build nested structure for YAML output
    const nestedConfig = buildNestedConfig(uniqueConfigs);

    // Generate YAML output
    const yamlOutput = yaml.dump(nestedConfig, {
      indent: 2,
      lineWidth: 120,
      sortKeys: true,
    });

    // Add header comment
    const output = `# Kibana Configuration Options
# Generated from codebase analysis using runtime schema introspection
# 
# For official documentation, see: https://www.elastic.co/guide/en/kibana/current/settings.html
#
# Format: option_name: type
#

${yamlOutput}`;

    if (outputPath) {
      const absoluteOutputPath = Path.isAbsolute(outputPath)
        ? outputPath
        : Path.join(REPO_ROOT, outputPath);
      Fs.writeFileSync(absoluteOutputPath, output);
      log.success(`Configuration options written to: ${absoluteOutputPath}`);
    } else {
      process.stdout.write(output);
    }

    log.info(`Found ${uniqueConfigs.length} configuration options`);
    log.info(`Successfully loaded schemas from ${loadedCount} plugins`);
    if (failedCount > 0) {
      log.warning(`Could not load schemas from ${failedCount} plugins (using fallback)`);
    }
  },
  {
    description: `
      Scans the Kibana codebase to find all configuration options that can be
      used in kibana.yml or kibana.dev.yml files.

      This script uses runtime schema introspection to extract configuration
      keys and their types directly from the @kbn/config-schema definitions.
    `,
    flags: {
      string: ['output'],
      boolean: ['verbose'],
      help: `
        --output=<path>    Write output to a file instead of stdout
        --verbose          Show detailed progress information
      `,
    },
  }
);
