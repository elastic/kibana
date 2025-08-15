/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import Fs from 'node:fs';
import chalk from 'chalk';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

/* TODO: Refactor this file to use the new enhanced validation functionality as extension points
 This will allow for more modular and maintainable code in the future.
 Potentially add new scripts or CLI commands that utilize the enhanced validation features.
 Example implementation:
 ```//scripts/oas_enhanced_validation.js
require('../src/setup_node_env');
require('@kbn/validate-oas').runEnhancedValidation();
```
*/

/**
 * @fileoverview
 * Main entry point for the Kibana OpenAPI Specification (OAS) validation package.
 *
 * This package provides comprehensive validation capabilities for Kibana's OpenAPI specifications,
 * including both basic validation with enhanced CLI features and advanced validation with
 * incremental processing, structured output formats, and performance optimizations.
 *
 * Key features:
 * - Enhanced CLI with modern command structure and helpful error messages
 * - Incremental validation based on git changes for faster development workflows
 * - Multiple output formats (CLI, JSON, GitHub comments) for different use cases
 * - Advanced caching and performance monitoring for large-scale validation
 * - Comprehensive error reporting with actionable guidance
 *
 * @example
 * ```typescript
 * // Basic validation usage
 * import { runBaseValidation } from '@kbn/validate-oas';
 *
 * const result = await runBaseValidation({
 *   only: 'serverless',
 *   paths: ['/api/fleet']
 * });
 *
 * // Enhanced validation usage
 * import { runEnhancedValidation } from '@kbn/validate-oas';
 *
 * const enhancedResult = await runEnhancedValidation({
 *   incremental: true,
 *   output: { format: 'json' }
 * });
 * ```
 */

// Export enhanced validation functionality
export {
  runEnhancedValidation,
  FileSelector,
  OutputFormatter,
  GitDiffAnalyzer,
} from './src/enhanced_validation';

// Export base validation functionality
export { runBaseValidation } from './src/base_validation';

export type {
  EnhancedValidationOptions,
  EnhancedValidationResult,
  FileSelectorOptions,
  OutputFormatterOptions,
  DiffAnalysisOptions,
  ValidationResult,
  ValidationError,
} from './src/enhanced_validation';

export type {
  BaseValidationOptions,
  BaseValidationResult,
  BaseValidationError,
  BaseValidationFileResult,
} from './src/base_validation';

// Legacy CLI validation function - extracted for maintainability
async function runLegacyValidation() {
  // Create a ToolingLog instance for consistent logging across the package
  const toolingLog = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const kibanaYamlPath = Path.resolve(REPO_ROOT, './oas_docs/output/kibana.yaml');
  const kibanaServerlessYamlPath = Path.resolve(
    REPO_ROOT,
    './oas_docs/output/kibana.serverless.yaml'
  );

  /**
   * Detect command mode based on arguments
   */
  const detectCommandMode = (args: string[]): 'legacy' | 'enhanced' => {
    if (args.includes('--help') || args.includes('-h')) {
      return 'enhanced';
    }

    if (args.includes('enhanced') || args.includes('--format') || args.includes('--incremental')) {
      return 'enhanced';
    }

    if (args.includes('base')) {
      return 'enhanced'; // Use enhanced CLI but with base validation
    }

    const enhancedFlags = ['--format', '--incremental', '--force'];
    const hasEnhancedFlags = enhancedFlags.some((flag) => args.includes(flag));
    if (hasEnhancedFlags) {
      return 'enhanced';
    }

    return 'legacy';
  };

  /**
   * Validate command flag combinations to prevent conflicts
   */
  const validateCommandFlags = (args: string[]): { valid: boolean; message?: string } => {
    if (!args.includes('enhanced') && !args.includes('base')) {
      if (args.includes('--format')) {
        return {
          valid: false,
          message:
            'Format option requires enhanced mode: node scripts/validate_oas_docs.js enhanced --format json',
        };
      }

      if (args.includes('--incremental')) {
        return {
          valid: false,
          message:
            'Incremental validation requires enhanced mode: node scripts/validate_oas_docs.js enhanced --incremental',
        };
      }
    }

    return { valid: true };
  };

  /**
   * Enhanced error handling with actionable guidance
   */
  const handleCLIError = (error: Error, mode: 'legacy' | 'enhanced', logger: ToolingLog): void => {
    if (mode === 'enhanced') {
      logger.error(chalk.red(`Enhanced validation failed: ${error.message}`));

      if (error.message.includes('git')) {
        logger.warning(
          chalk.yellow('Tip: Ensure you are in a git repository for incremental validation')
        );
      } else if (error.message.includes('bootstrap')) {
        logger.warning(chalk.yellow('Tip: Run "yarn kbn bootstrap" to rebuild dependencies'));
      } else if (error.message.includes('command not found')) {
        logger.warning(chalk.yellow('Tip: Run "yarn kbn bootstrap" to rebuild dependencies'));
      }
    } else {
      // Legacy error handling with ToolingLog instead of console
      logger.error(chalk.red(`Validation failed: ${error.message}`));
    }

    process.exit(1);
  };

  const args = process.argv;
  const commandMode = detectCommandMode(args);

  const flagValidation = validateCommandFlags(args);
  if (!flagValidation.valid) {
    toolingLog.error(`${chalk.red('Error:')} ${flagValidation.message}`);
    process.exit(1);
  }

  if (commandMode === 'enhanced') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runOASValidationCLI } = require('./src/cli_commands');
    return runOASValidationCLI().catch((error: Error) => {
      handleCLIError(error, 'enhanced', toolingLog);
    });
  } else {
    // Use legacy CLI for backward compatibility
    return run(
      async ({ log, flagsReader }) => {
        const paths = flagsReader.arrayOfStrings('path');
        const only = flagsReader.string('only') as 'traditional' | 'serverless' | undefined;

        if (only && only !== 'traditional' && only !== 'serverless') {
          log.error('Invalid value for --only flag, must be "traditional" or "serverless"');
          process.exit(1);
        }

        const { Validator } = await import('@seriousme/openapi-schema-validator');
        const validator = new Validator({ strict: false, allErrors: true });

        let invalidSpec = false;
        const yamlPaths: string[] = [];

        if (only === 'traditional') {
          yamlPaths.push(kibanaYamlPath);
        } else if (only === 'serverless') {
          yamlPaths.push(kibanaServerlessYamlPath);
        } else {
          yamlPaths.push(kibanaYamlPath, kibanaServerlessYamlPath);
        }

        for (const yamlPath of yamlPaths) {
          log.info(`About to validate spec at ${chalk.underline(yamlPath)}`);
          await log.indent(4, async () => {
            const result = await validator.validate(Fs.readFileSync(yamlPath).toString('utf-8'));
            if (!result.valid) {
              log.warning(`${chalk.underline(yamlPath)} is NOT valid`);

              let errorMessage: undefined | string;
              let errorCount = 0;

              if (Array.isArray(result.errors)) {
                errorMessage = result.errors
                  .filter(
                    (error) =>
                      // The below is noisey and a result of how the schema validation works. No aspect of the OAS spec should
                      // require the use of `$ref`, it's an optional optimization.
                      error.params.missingProperty !== '$ref' &&
                      error.params.passingSchemas !== null &&
                      (paths?.length
                        ? paths.some((path) => error.instancePath.startsWith(path))
                        : true)
                  )
                  .map(({ instancePath, message }) => {
                    errorCount++;
                    return `${chalk.gray(instancePath)}\n${message}`;
                  })
                  .join('\n\n');
              } else if (typeof result.errors === 'string') {
                errorCount = 1;
                errorMessage = result.errors;
              }
              log.warning('Found the following issues\n\n' + errorMessage + '\n');
              log.warning(`Found ${chalk.bold(errorCount)} errors in ${chalk.underline(yamlPath)}`);
              invalidSpec = true;
            } else {
              log.success(`${chalk.underline(yamlPath)} is valid`);
            }
          });
        }

        log.info('Done');
        if (invalidSpec) {
          handleCLIError(new Error('Validation failed with errors'), 'legacy', log);
        }
      },
      {
        description: 'Validate Kibana OAS YAML files (in oas_docs/output)',
        usage: 'node ./scripts/validate_oas_docs.js',
        flags: {
          string: ['path', 'only'],
        },
      }
    );
  }
}

// Export the legacy validation function for backward compatibility
export { runLegacyValidation };

// Run CLI validation when this file is required (not just when executed directly)
// This maintains compatibility with scripts/validate_oas_docs.js
runLegacyValidation().catch((error: Error) => {
  process.stderr.write(`Validation failed: ${error}\n`);
  process.exit(1);
});

// Run CLI validation when this file is executed directly
if (require.main === module) {
  runLegacyValidation().catch((error: Error) => {
    process.stderr.write(`Validation failed: ${error}\n`);
    process.exit(1);
  });
}

/* TODO: Refactor this file to use the new enhanced validation functionality as extension points
 This will allow for more modular and maintainable code in the future.
 Potentially add new scripts or CLI commands that utilize the enhanced validation features.
 Example implementation:
 ```//scripts/oas_enhanced_validation.js
require('../src/setup_node_env');
require('@kbn/validate-oas').runEnhancedValidation();
```
*/
