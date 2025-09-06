/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunWithCommands, type Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { execSync } from 'child_process';
import { runBaseValidation } from './base_validation';
import { runEnhancedValidation } from './enhanced_validation';

/**
 * Creates the CLI command definitions for OpenAPI Specification (OAS) validation.
 *
 * This function defines two main commands:
 * - `base`: Basic OAS validation with enhanced CLI features (recommended migration from legacy)
 * - `enhanced`: Advanced OAS validation with JSON output, incremental validation, and more
 *
 * @returns Array of command objects compatible with @kbn/dev-cli-runner
 *
 * @example
 * ```typescript
 * import { createCLICommands } from './cli_commands';
 *
 * const commands = createCLICommands();
 * // commands[0] is the 'base' command
 * // commands[1] is the 'enhanced' command
 * ```
 *
 * @public
 */
export function createCLICommands() {
  const baseCommand: Command<{}> = {
    name: 'base',
    description:
      'Run basic OAS validation with enhanced CLI features (recommended migration from legacy)',
    usage: 'node scripts/validate_oas_docs.js base [options]',
    flags: {
      string: ['path', 'only'],
      help: `
        --path             Pass in the (start of) a custom path to focus OAS validation error reporting, can be specified multiple times.
        --only             Validate only OAS for a specific offering, one of "traditional" or "serverless". Omitting this will validate all offerings.

Migration note: This provides the same functionality as the legacy mode but with enhanced CLI features.
      `,
    },
    run: async ({ flagsReader, log }) => {
      const paths = flagsReader.arrayOfStrings('path');
      const only = flagsReader.string('only') as 'traditional' | 'serverless' | undefined;

      if (only && only !== 'traditional' && only !== 'serverless') {
        throw createFlagError(
          'Invalid value for --only flag, must be "traditional" or "serverless"'
        );
      }

      try {
        const result = await runBaseValidation({
          only,
          paths: paths && paths.length > 0 ? paths : undefined,
          toolingLog: log,
        });

        if (!result.success) {
          throw new Error('❌ Validation completed with errors');
        }

        log.success('✅ All validations passed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (error instanceof Error && error.message.includes('bootstrap')) {
          throw new Error(`${errorMessage}. Try running: yarn kbn bootstrap`);
        }
        throw new Error(`Validation failed: ${errorMessage}`);
      }
    },
  };

  const enhancedCommand: Command<{}> = {
    name: 'enhanced',
    description:
      'Run enhanced OAS validation with advanced features (JSON output, incremental validation, etc.)',
    usage: 'node scripts/validate_oas_docs.js enhanced [options]',
    flags: {
      string: ['path', 'only', 'format'],
      boolean: ['incremental', 'force'],
      help: `
        --path             Pass in the (start of) a custom path to focus OAS validation error reporting, can be specified multiple times.
        --only             Validate only OAS for a specific offering, one of "traditional" or "serverless". Omitting this will validate all offerings.
        --format           Output format: "cli", "json", or "github-comment". Default: "cli".
        --incremental      Enable incremental validation based on git changes (requires git repository).
        --force            Force validation even if no changes detected in incremental mode.

Enhanced features:
        • Structured JSON output for CI/CD integration
        • GitHub comment format for PR automation
        • Incremental validation for faster development
        • Advanced caching and performance optimizations
      `,
    },
    run: async ({ flagsReader, log }) => {
      const paths = flagsReader.arrayOfStrings('path');
      const only = flagsReader.string('only') as 'traditional' | 'serverless' | undefined;
      const format = flagsReader.string('format') || 'cli';
      const incremental = flagsReader.boolean('incremental');
      const force = flagsReader.boolean('force');

      if (only && only !== 'traditional' && only !== 'serverless') {
        throw createFlagError(
          'Invalid value for --only flag, must be "traditional" or "serverless"'
        );
      }

      if (format && !['cli', 'json', 'github-comment'].includes(format)) {
        throw createFlagError(
          'Invalid value for --format flag, must be "cli", "json", or "github-comment"'
        );
      }

      if (incremental) {
        try {
          execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        } catch (error) {
          throw createFlagError('Incremental validation requires a git repository');
        }
      }

      try {
        const result = await runEnhancedValidation({
          base: {
            only,
            paths: paths && paths.length > 0 ? paths : undefined,
          },
          file: {
            includePaths: paths && paths.length > 0 ? paths : undefined,
          },
          output: {
            format: format as 'cli' | 'json' | 'github-comment',
          },
          incremental,
          force,
        });

        if (format === 'json') {
          // eslint-disable-next-line no-console
          console.log(result.output);
        } else {
          log.write(result.output);
        }

        if (format === 'cli' && result.exitCode === 0) {
          log.success('✅ Enhanced validation completed successfully');
          if (incremental) {
            log.info('💡 Incremental mode: Only changed files were validated');
          }
        }

        if (result.exitCode !== 0) {
          throw new Error('Enhanced validation completed with errors');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (error instanceof Error) {
          if (error.message.includes('git')) {
            throw new Error(
              `${errorMessage}. Ensure you are in a git repository for incremental validation`
            );
          } else if (error.message.includes('bootstrap')) {
            throw new Error(`${errorMessage}. Try running: yarn kbn bootstrap`);
          } else if (error.message.includes('command not found')) {
            throw new Error(
              `${errorMessage}. Try running: yarn kbn bootstrap to rebuild dependencies`
            );
          }
        }

        throw new Error(`Enhanced validation failed: ${errorMessage}`);
      }
    },
  };

  return [baseCommand, enhancedCommand];
}

/**
 * Executes the OAS validation CLI with the configured commands.
 *
 * This function sets up and runs the CLI interface for validating Kibana's OpenAPI specifications.
 * It provides a complete command-line interface with help text, examples, and migration guidance.
 *
 * @returns Promise that resolves when the CLI execution is complete
 *
 * @example
 * ```typescript
 * // Run from a script file (e.g., scripts/validate_oas_docs.js)
 * import { runOASValidationCLI } from '@kbn/validate-oas';
 * import { ToolingLog } from '@kbn/tooling-log';
 *
 * const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
 *
 * runOASValidationCLI()
 *   .then(() => log.success('Validation completed'))
 *   .catch((error) => {
 *     log.error('Validation failed:', error);
 *     process.exit(1);
 *   });
 * ```
 *
 * @example
 * ```bash
 * # Command line usage examples:
 *
 * # Basic validation
 * node scripts/validate_oas_docs.js base
 *
 * # Enhanced validation with JSON output
 * node scripts/validate_oas_docs.js enhanced --format json
 *
 * # Incremental validation for faster development
 * node scripts/validate_oas_docs.js enhanced --incremental
 *
 * # Validate specific offering only
 * node scripts/validate_oas_docs.js base --only serverless
 * ```
 *
 * @public
 */
export function runOASValidationCLI() {
  const commands = createCLICommands();

  const runner = new RunWithCommands(
    {
      description: 'Validate Kibana OAS YAML files (in oas_docs/output)',
      usage: 'node ./scripts/validate_oas_docs.js <command> [options]',
      globalFlags: {
        help: `
🔍 Validate OpenAPI specifications for Kibana APIs

Available commands:
  base        Basic OAS validation with enhanced CLI features (recommended migration from legacy)
  enhanced    Advanced OAS validation with JSON output, incremental validation, and more

📋 Examples:

Basic validation (enhanced CLI features):
  node ./scripts/validate_oas_docs.js base
  node ./scripts/validate_oas_docs.js base --only serverless --path /paths/~1api~1fleet

Advanced validation (new features):
  node ./scripts/validate_oas_docs.js enhanced --incremental --format json
  node ./scripts/validate_oas_docs.js enhanced --force --format github-comment
  node ./scripts/validate_oas_docs.js enhanced --only traditional --format cli

🚀 Migration guide:
  Legacy:    node ./scripts/validate_oas_docs.js
  Enhanced:  node ./scripts/validate_oas_docs.js base

💡 For CI/CD integration, use: node ./scripts/validate_oas_docs.js enhanced --format json
💡 For PR automation, use: node ./scripts/validate_oas_docs.js enhanced --format github-comment
        `,
      },
    },
    commands
  );

  return runner.execute();
}
