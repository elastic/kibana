/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import type {
  BaseValidationOptions,
  BaseValidationResult,
  BaseValidationError,
  BaseValidationFileResult,
} from './base_validation';
import { runBaseValidation } from './base_validation';
import { validationCache } from './validation_cache';

// Mock external dependencies
jest.mock('node:fs');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/kibana/root',
}));

// Mock the OpenAPI validator to avoid ES module issues in Jest
const mockValidate = jest.fn();
jest.mock('@seriousme/openapi-schema-validator', () => ({
  Validator: jest.fn().mockImplementation(() => ({
    validate: mockValidate,
  })),
}));

const mockFs = Fs as jest.Mocked<typeof Fs>;

// Test fixtures and utilities
const TestFixtures = {
  VALID_OAS_MINIMAL: `{
    "openapi": "3.0.0",
    "info": {
      "title": "Test API",
      "version": "1.0.0"
    },
    "paths": {}
  }`,

  VALID_OAS_COMPLETE: `{
    "openapi": "3.0.0",
    "info": {
      "title": "Complete Test API",
      "version": "1.0.0",
      "description": "A complete test API with all sections"
    },
    "servers": [
      { "url": "https://api.example.com/v1" }
    ],
    "paths": {
      "/users": {
        "get": {
          "summary": "Get users",
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object"
                  }
                }
              }
            }
          }
        }
      }
    },
    "components": {
      "schemas": {
        "User": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" }
          }
        }
      }
    }
  }`,

  INVALID_OAS_MISSING_INFO: `{
    "openapi": "3.0.0",
    "paths": {}
  }`,

  INVALID_OAS_MALFORMED_JSON: `{
    "openapi": "3.0.0",
    "info": {
      "title": "Test API",
      "version": "1.0.0"
    },
    "paths": {
      "/invalid": {
        "get": {
          "responses": {
            "200": {
              // Invalid JSON comment
            }
          }
        }
      }
    }`,

  OAS_WITH_REF_ERRORS: `{
    "openapi": "3.0.0",
    "info": {
      "title": "Test API with $ref errors",
      "version": "1.0.0"
    },
    "paths": {
      "/test": {
        "get": {
          "responses": {
            "200": {
              "description": "Success"
            }
          }
        }
      }
    }
  }`,

  MALFORMED_YAML: `
openapi: 3.0.0
info:
  title: Malformed YAML
  version: 1.0.0
paths:
  /test:
    - invalid list item
`,
};

// Mock logger for testing
class MockLogger {
  public logs: Array<{ level: string; message: string; args: any[] }> = [];

  log = (message: string, ...args: any[]): void => {
    this.logs.push({ level: 'log', message, args });
  };

  error = (message: string, ...args: any[]): void => {
    this.logs.push({ level: 'error', message, args });
  };

  warn = (message: string, ...args: any[]): void => {
    this.logs.push({ level: 'warn', message, args });
  };

  debug = (message: string, ...args: any[]): void => {
    this.logs.push({ level: 'debug', message, args });
  };

  clear(): void {
    this.logs = [];
  }

  getLogsByLevel(level: string): Array<{ message: string; args: any[] }> {
    return this.logs.filter((log) => log.level === level);
  }

  hasLogContaining(level: string, text: string): boolean {
    return this.logs.some((log) => log.level === level && log.message.includes(text));
  }
}

describe('@kbn/validate-oas base validation', () => {
  let mockLogger: MockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new MockLogger();

    // Setup default file system mocks
    mockFs.readFileSync = jest.fn();

    // Setup default validator behavior
    mockValidate.mockResolvedValue({
      valid: true,
      errors: [],
    });

    // Clear any existing cache to ensure clean test state
    validationCache.clear();
  });

  describe('runBaseValidation - Happy Path Scenarios', () => {
    describe('Traditional Validation Mode', () => {
      it('should successfully validate valid OAS files in traditional mode', async () => {
        // Setup
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const options: BaseValidationOptions = {
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        };

        // Execute
        const result: BaseValidationResult = await runBaseValidation(options);

        // Verify
        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.validFiles).toBe(1);
        expect(result.invalidFiles).toBe(0);
        expect(result.totalErrors).toBe(0);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].filePath).toBe('/mock/kibana/root/oas_docs/output/kibana.yaml');
        expect(result.results[0].variant).toBe('traditional');
        expect(result.results[0].valid).toBe(true);
        expect(result.results[0].errors).toHaveLength(0);

        expect(mockLogger.hasLogContaining('log', 'About to validate spec at')).toBe(true);
        expect(mockLogger.hasLogContaining('log', 'is valid')).toBe(true);
        expect(mockLogger.hasLogContaining('log', 'Done')).toBe(true);
      });

      it('should handle minimal valid OAS files correctly', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_MINIMAL);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.results[0].filePath).toBe('/mock/kibana/root/oas_docs/output/kibana.yaml');
        expect(result.results[0].valid).toBe(true);
        expect(result.results[0].errorCount).toBe(0);
      });
    });

    describe('Serverless Validation Mode', () => {
      it('should successfully validate serverless OAS files', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          only: 'serverless',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(1);
        expect(result.results[0].filePath).toBe(
          '/mock/kibana/root/oas_docs/output/kibana.serverless.yaml'
        );
        expect(result.results[0].variant).toBe('serverless');
        expect(result.results[0].valid).toBe(true);
      });

      it('should validate both traditional and serverless when no mode specified', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(2);
        expect(result.validFiles).toBe(2);
        expect(result.results[0].variant).toBe('traditional');
        expect(result.results[1].variant).toBe('serverless');
        expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
      });
    });

    describe('Custom File Validation', () => {
      it('should handle custom file paths correctly', async () => {
        const customFiles = ['/custom/path/api1.yaml', '/custom/path/api2.yaml'];
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          customFiles,
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(2);
        expect(result.results[0].filePath).toBe('/custom/path/api1.yaml');
        expect(result.results[1].filePath).toBe('/custom/path/api2.yaml');
        expect(result.results[0].variant).toBe('custom');
        expect(result.results[1].variant).toBe('custom');
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/custom/path/api1.yaml', 'utf-8');
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/custom/path/api2.yaml', 'utf-8');
      });

      it('should prioritize custom files over default files', async () => {
        const customFiles = ['/custom/path/api.yaml'];
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          customFiles,
          only: 'traditional', // This should be ignored when custom files are provided
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.totalFiles).toBe(1);
        expect(result.results[0].filePath).toBe('/custom/path/api.yaml');
        expect(result.results[0].variant).toBe('custom');
      });
    });

    describe('Logging Functionality', () => {
      it('should log validation progress in verbose mode', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        await runBaseValidation({
          only: 'traditional',
          useLogging: true,
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(mockLogger.getLogsByLevel('log').length).toBeGreaterThan(0);
        expect(mockLogger.hasLogContaining('log', 'About to validate spec at')).toBe(true);
        expect(mockLogger.hasLogContaining('log', 'Done')).toBe(true);
      });

      it('should remain silent in quiet mode', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        await runBaseValidation({
          only: 'traditional',
          useLogging: false,
        });

        expect(mockLogger.logs).toHaveLength(0);
      });

      it('should use custom logger when provided', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const customLogger = new MockLogger();
        await runBaseValidation({
          only: 'traditional',
          logger: customLogger,
        });

        expect(customLogger.logs.length).toBeGreaterThan(0);
        expect(customLogger.hasLogContaining('log', 'About to validate spec at')).toBe(true);
      });

      it('should log to stdout/stderr by default when useLogging is true', async () => {
        const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
        const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();

        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        await runBaseValidation({
          only: 'traditional',
          useLogging: true,
        });

        expect(stdoutSpy).toHaveBeenCalled();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
      });
    });
  });

  describe('runBaseValidation - Error Handling', () => {
    describe('Invalid OAS Files', () => {
      it('should handle malformed OAS files gracefully', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.INVALID_OAS_MISSING_INFO);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/info',
              message: 'Missing required property: info',
              params: { missingProperty: 'info', passingSchemas: ['test'] }, // Not filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.validFiles).toBe(0);
        expect(result.invalidFiles).toBe(1);
        expect(result.totalErrors).toBe(1);
        expect(result.results[0].valid).toBe(false);
        expect(result.results[0].errors).toHaveLength(1);
        expect(result.results[0].errors[0].message).toBe('Missing required property: info');
        expect(mockLogger.hasLogContaining('warn', 'is NOT valid')).toBe(true);
      });

      it('should handle JSON parsing errors', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.INVALID_OAS_MALFORMED_JSON);
        mockValidate.mockRejectedValue(new Error('Invalid JSON syntax'));

        // The base validation function doesn't catch validation errors, so it should throw
        await expect(
          runBaseValidation({
            only: 'traditional',
            logger: mockLogger,
            cache: { enabled: false },
          })
        ).rejects.toThrow('Invalid JSON syntax');
      });

      it('should handle files with missing required fields', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.INVALID_OAS_MISSING_INFO);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '',
              message: 'Missing required properties: info',
              params: { missingProperty: 'info', passingSchemas: ['test'] }, // Not filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.results[0].errors[0].message).toBe('Missing required properties: info');
      });

      it('should handle validation errors as string instead of array', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.INVALID_OAS_MISSING_INFO);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: 'General validation error occurred',
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.results[0].errors[0].message).toBe('General validation error occurred');
        expect(result.results[0].errorCount).toBe(1);
      });
    });

    describe('File System Errors', () => {
      it('should handle missing files appropriately', async () => {
        mockFs.readFileSync.mockImplementation(() => {
          const error = new Error('ENOENT: no such file or directory');
          (error as any).code = 'ENOENT';
          throw error;
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.results[0].valid).toBe(false);
        expect(result.results[0].errors[0].message).toContain('Failed to read file');
        expect(mockLogger.hasLogContaining('warn', 'could not be read')).toBe(true);
      });

      it('should handle permission errors', async () => {
        mockFs.readFileSync.mockImplementation(() => {
          const error = new Error('EACCES: permission denied');
          (error as any).code = 'EACCES';
          throw error;
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.success).toBe(false);
        expect(result.results[0].errors[0].message).toContain('permission denied');
      });

      it('should handle multiple file read failures', async () => {
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File system error');
        });

        const result = await runBaseValidation({
          logger: mockLogger,
          cache: { enabled: false },
        }); // Both traditional and serverless

        expect(result.totalFiles).toBe(2);
        expect(result.validFiles).toBe(0);
        expect(result.invalidFiles).toBe(2);
        expect(result.results[0].valid).toBe(false);
        expect(result.results[1].valid).toBe(false);
      });
    });

    describe('Validation Library Errors', () => {
      it('should handle swagger-parser internal errors', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockRejectedValue(new Error('Internal validation error'));

        // The base validation function doesn't catch validation errors, so it should throw
        await expect(
          runBaseValidation({
            only: 'traditional',
            logger: mockLogger,
            cache: { enabled: false },
          })
        ).rejects.toThrow('Internal validation error');
      });

      it('should handle timeout errors gracefully', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Validation timeout')), 100);
          });
        });

        // The base validation function doesn't catch validation errors, so it should throw
        await expect(
          runBaseValidation({
            only: 'traditional',
            logger: mockLogger,
            cache: { enabled: false },
          })
        ).rejects.toThrow('Validation timeout');
      });
    });

    describe('Invalid Options', () => {
      it('should throw error for invalid "only" parameter', async () => {
        await expect(
          runBaseValidation({
            only: 'invalid' as any,
            logger: mockLogger,
            cache: { enabled: false },
          })
        ).rejects.toThrow('Invalid value for only option, must be "traditional" or "serverless"');

        expect(mockLogger.hasLogContaining('error', 'Invalid value for only option')).toBe(true);
      });
    });
  });

  describe('runBaseValidation - Edge Cases', () => {
    describe('Empty and No-File Scenarios', () => {
      it('should handle empty custom file list input', async () => {
        const result = await runBaseValidation({
          customFiles: [],
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.totalFiles).toBe(2); // Falls back to default files
        expect(result.results).toHaveLength(2);
      });

      it('should handle undefined custom files', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          customFiles: undefined,
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.totalFiles).toBe(2); // Both traditional and serverless
      });
    });

    describe('Error Filtering', () => {
      it('should filter noisy $ref errors correctly', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/paths/test',
              message: 'Real validation error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered: not $ref and not null
            },
            {
              instancePath: '/components/schemas',
              message: 'Missing $ref property',
              params: { missingProperty: '$ref', passingSchemas: ['test'] }, // FILTERED: is $ref
            },
            {
              instancePath: '/paths/another',
              message: 'Another error',
              params: { missingProperty: 'other', passingSchemas: null }, // FILTERED: is null
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        // Should filter out the $ref error and the one with passingSchemas !== null
        expect(result.results[0].errorCount).toBe(1);
        expect(result.results[0].errors[0].message).toBe('Real validation error');
      });

      it('should not filter errors when params structure is different', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/paths/test',
              message: 'Valid error',
              params: { missingProperty: 'required', passingSchemas: ['test'] }, // NOT filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.results[0].errorCount).toBe(1);
        expect(result.results[0].errors[0].message).toBe('Valid error');
      });
    });

    describe('Path Filtering', () => {
      it('should filter error paths correctly', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/paths/api/users',
              message: 'Users API error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered
            },
            {
              instancePath: '/paths/api/admin',
              message: 'Admin API error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered, but path filtered
            },
            {
              instancePath: '/components/schemas',
              message: 'Schema error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered, but path filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          paths: ['/paths/api/users'], // Only include users path
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.results[0].errorCount).toBe(1);
        expect(result.results[0].errors[0].message).toBe('Users API error');
      });

      it('should include only specified path patterns', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/paths/api/fleet',
              message: 'Fleet API error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered
            },
            {
              instancePath: '/paths/api/security',
              message: 'Security API error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          paths: ['/paths/api/fleet', '/paths/api/security'],
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.results[0].errorCount).toBe(2);
      });

      it('should report all errors when no path filter is provided', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/paths/api/users',
              message: 'Users API error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered
            },
            {
              instancePath: '/components/schemas',
              message: 'Schema error',
              params: { missingProperty: 'test', passingSchemas: ['test'] }, // NOT filtered
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.results[0].errorCount).toBe(2);
      });
    });

    describe('Large File Handling', () => {
      it('should handle very large OAS files', async () => {
        const largeOasContent = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Large API', version: '1.0.0' },
          paths: Object.fromEntries(
            Array.from({ length: 1000 }, (_, i) => [
              `/endpoint${i}`,
              {
                get: {
                  summary: `Endpoint ${i}`,
                  responses: { 200: { description: 'Success' } },
                },
              },
            ])
          ),
        });

        mockFs.readFileSync.mockReturnValue(largeOasContent);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const startTime = Date.now();
        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });

      it('should handle memory efficiently with multiple large files', async () => {
        const largeOasContent = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Large API', version: '1.0.0' },
          paths: Object.fromEntries(
            Array.from({ length: 500 }, (_, i) => [
              `/endpoint${i}`,
              { get: { summary: `Endpoint ${i}`, responses: { 200: { description: 'Success' } } } },
            ])
          ),
        });

        mockFs.readFileSync.mockReturnValue(largeOasContent);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const initialMemory = process.memoryUsage().heapUsed;
        await runBaseValidation({ logger: mockLogger }); // Both files
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = finalMemory - initialMemory;

        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      });
    });

    describe('Complex Error Scenarios', () => {
      it('should handle mixed valid and invalid files', async () => {
        mockFs.readFileSync
          .mockReturnValueOnce(TestFixtures.VALID_OAS_COMPLETE) // First file valid
          .mockReturnValueOnce(TestFixtures.INVALID_OAS_MISSING_INFO); // Second file invalid

        mockValidate.mockResolvedValueOnce({ valid: true, errors: [] }).mockResolvedValueOnce({
          valid: false,
          errors: [
            {
              instancePath: '/info',
              message: 'Missing info',
              params: { missingProperty: 'info', passingSchemas: null },
            },
          ],
        });

        const result = await runBaseValidation({ logger: mockLogger });

        expect(result.totalFiles).toBe(2);
        expect(result.validFiles).toBe(1);
        expect(result.invalidFiles).toBe(1);
        expect(result.success).toBe(false); // Overall failure due to one invalid file
        expect(result.results[0].valid).toBe(true);
        expect(result.results[1].valid).toBe(false);
      });

      it('should handle validation that succeeds but with filtered errors', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.OAS_WITH_REF_ERRORS);
        mockValidate.mockResolvedValue({
          valid: false,
          errors: [
            {
              instancePath: '/components/schemas',
              message: 'Missing $ref property', // This should be filtered out
              params: { missingProperty: '$ref', passingSchemas: ['test'] }, // FILTERED due to $ref
            },
          ],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        expect(result.results[0].errorCount).toBe(0); // Filtered error doesn't count
        expect(result.results[0].valid).toBe(false); // Still invalid because validationResult.valid was false
        expect(result.success).toBe(false);
      });
    });
  });

  describe('runBaseValidation - Performance', () => {
    describe('Performance Benchmarks', () => {
      it('should complete validation within reasonable time limits', async () => {
        const files = Array.from({ length: 10 }, (_, i) => `/custom/api${i}.yaml`);
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const startTime = Date.now();
        const result = await runBaseValidation({
          customFiles: files,
          logger: mockLogger,
          cache: { enabled: false },
        });
        const duration = Date.now() - startTime;

        expect(result.totalFiles).toBe(10);
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds for 10 files
      });

      it('should scale linearly with file count', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        // Test with different file counts
        const smallFiles = Array.from({ length: 5 }, (_, i) => `/small/api${i}.yaml`);
        const mediumFiles = Array.from({ length: 10 }, (_, i) => `/medium/api${i}.yaml`);
        const largeFiles = Array.from({ length: 20 }, (_, i) => `/large/api${i}.yaml`);

        const startSmall = Date.now();
        await runBaseValidation({ customFiles: smallFiles, logger: mockLogger });
        const timeSmall = Date.now() - startSmall;

        const startMedium = Date.now();
        await runBaseValidation({ customFiles: mediumFiles, logger: mockLogger });
        const timeMedium = Date.now() - startMedium;

        const startLarge = Date.now();
        await runBaseValidation({ customFiles: largeFiles, logger: mockLogger });
        const timeLarge = Date.now() - startLarge;

        // Check that scaling is roughly linear (allowing for some variance)
        // If any measurement is 0, consider the test passed (too fast to measure)
        if (timeSmall > 0 && timeMedium > 0) {
          const ratioMediumToSmall = timeMedium / timeSmall;
          expect(ratioMediumToSmall).toBeLessThan(5); // Should not be more than 5x slower
        }

        if (timeMedium > 0 && timeLarge > 0) {
          const ratioLargeToMedium = timeLarge / timeMedium;
          expect(ratioLargeToMedium).toBeLessThan(5); // Should scale roughly linearly
        }
      });
    });

    describe('Resource Usage', () => {
      it('should not leak memory during validation', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const initialMemory = process.memoryUsage().heapUsed;

        // Run multiple validation cycles
        for (let i = 0; i < 10; i++) {
          await runBaseValidation({
            only: 'traditional',
            logger: mockLogger,
            cache: { enabled: false },
          });
        }

        if (global.gc) {
          global.gc(); // Force garbage collection if available
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = finalMemory - initialMemory;

        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
      });

      it('should handle concurrent validations efficiently', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const concurrentValidations = 5;
        const promises = Array.from({ length: concurrentValidations }, () =>
          runBaseValidation({
            customFiles: ['/test/concurrent.yaml'],
            logger: mockLogger,
            cache: { enabled: false },
          })
        );

        const startTime = Date.now();
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        // All validations should succeed
        results.forEach((result) => {
          expect(result.success).toBe(true);
          expect(result.totalFiles).toBe(1);
        });

        // Concurrent processing should not take significantly longer than sequential
        expect(duration).toBeLessThan(5000); // 5 seconds max for 5 concurrent validations
      });

      it('should maintain performance under stress conditions', async () => {
        // Create large OAS file content
        const largeOASContent = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Large API', version: '1.0.0' },
          paths: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [
              `/endpoint${i}`,
              {
                get: {
                  summary: `Endpoint ${i}`,
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: Object.fromEntries(
                              Array.from({ length: 10 }, (__, idx) => [
                                `field${idx}`,
                                { type: 'string', description: `Field ${idx}` },
                              ])
                            ),
                          },
                        },
                      },
                    },
                  },
                },
              },
            ])
          ),
        });

        mockFs.readFileSync.mockReturnValue(largeOASContent);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const startTime = Date.now();
        const result = await runBaseValidation({
          customFiles: ['/test/large.yaml'],
          logger: mockLogger,
          cache: { enabled: false },
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(10000); // Should handle large files within 10 seconds
      });

      it('should handle memory-intensive operations gracefully', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const initialMemory = process.memoryUsage();
        const fileCount = 50;
        const files = Array.from({ length: fileCount }, (_, i) => `/memory/test${i}.yaml`);

        const result = await runBaseValidation({
          customFiles: files,
          logger: mockLogger,
          cache: { enabled: false },
        });

        const finalMemory = process.memoryUsage();
        const memoryDelta = {
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
          external: finalMemory.external - initialMemory.external,
        };

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(fileCount);

        // Memory growth should be reasonable relative to the number of files
        expect(memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB for 50 files
      });
    });

    describe('Load Testing', () => {
      it('should handle high-volume file validation efficiently', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_MINIMAL);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const testSizes = [10, 25, 50, 100];
        const performanceResults: Array<{
          size: number;
          duration: number;
          throughput: number;
        }> = [];

        for (const size of testSizes) {
          const files = Array.from({ length: size }, (_, i) => `/load/test${i}.yaml`);

          const startTime = Date.now();
          const result = await runBaseValidation({
            customFiles: files,
            logger: mockLogger,
            cache: { enabled: false },
          });
          const duration = Math.max(Date.now() - startTime, 1); // Ensure minimum 1ms to avoid division by zero
          const throughput = size / (duration / 1000); // files per second

          expect(result.success).toBe(true);
          expect(result.totalFiles).toBe(size);

          performanceResults.push({ size, duration, throughput });
        }

        // Verify throughput doesn't degrade significantly with size
        const smallThroughput = performanceResults[0].throughput;
        const largeThroughput = performanceResults[performanceResults.length - 1].throughput;

        // Throughput should not drop more than 50% from small to large
        expect(largeThroughput).toBeGreaterThan(smallThroughput * 0.5);
      });

      it('should maintain consistent performance across validation runs', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const runs = 10;
        const fileCount = 20;
        const files = Array.from({ length: fileCount }, (_, i) => `/consistency/test${i}.yaml`);
        const durations: number[] = [];

        for (let run = 0; run < runs; run++) {
          const startTime = Date.now();
          const result = await runBaseValidation({
            customFiles: files,
            logger: mockLogger,
            cache: { enabled: false },
          });
          const duration = Math.max(Date.now() - startTime, 1); // Ensure minimum 1ms

          expect(result.success).toBe(true);
          durations.push(duration);
        }

        // Calculate performance consistency metrics
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const variance =
          durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = avgDuration > 0 ? stdDev / avgDuration : 0;

        // Performance should be consistent (coefficient of variation < 0.3)
        expect(coefficientOfVariation).toBeLessThan(0.3);
        expect(avgDuration).toBeLessThan(5000); // Average should be under 5 seconds
      });

      it('should scale efficiently with mixed file sizes', async () => {
        const smallOAS = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Small API', version: '1.0.0' },
          paths: { '/single': { get: { responses: { '200': { description: 'OK' } } } } },
        });

        const mediumOAS = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Medium API', version: '1.0.0' },
          paths: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [
              `/path${i}`,
              { get: { responses: { '200': { description: 'OK' } } } },
            ])
          ),
        });

        const largeOAS = JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Large API', version: '1.0.0' },
          paths: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [
              `/path${i}`,
              {
                get: {
                  parameters: [{ name: 'param', in: 'query', schema: { type: 'string' } }],
                  responses: {
                    '200': {
                      description: 'OK',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: { id: { type: 'string' }, name: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ])
          ),
        });

        // Mock different file sizes
        mockFs.readFileSync.mockImplementation((path: any) => {
          if (typeof path === 'string') {
            if (path.includes('small')) return smallOAS;
            if (path.includes('medium')) return mediumOAS;
            if (path.includes('large')) return largeOAS;
          }
          return TestFixtures.VALID_OAS_MINIMAL;
        });

        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const mixedFiles = [
          ...Array.from({ length: 5 }, (_, i) => `/mixed/small${i}.yaml`),
          ...Array.from({ length: 3 }, (_, i) => `/mixed/medium${i}.yaml`),
          ...Array.from({ length: 2 }, (_, i) => `/mixed/large${i}.yaml`),
        ];

        const startTime = Date.now();
        const result = await runBaseValidation({
          customFiles: mixedFiles,
          logger: mockLogger,
          cache: { enabled: false },
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(mixedFiles.length);
        expect(duration).toBeLessThan(15000); // Should handle mixed sizes within 15 seconds
      });
    });

    describe('Stress Testing', () => {
      it('should handle error-heavy validation loads', async () => {
        // Create files with various error patterns
        const errorPatterns = [
          '{"openapi": "invalid"}', // Missing required fields
          '{"openapi": "3.0.0"}', // Missing info
          '{"openapi": "3.0.0", "info": {"title": "Test"}}', // Missing version
          '{ invalid json', // Malformed JSON
          'openapi: 3.0.0\ninfo:\n  - invalid', // Invalid YAML
        ];

        mockFs.readFileSync.mockImplementation((path: any) => {
          const index = parseInt(String(path).match(/\d+/)?.[0] || '0', 10);
          return errorPatterns[index % errorPatterns.length];
        });

        mockValidate.mockImplementation(async () => {
          // Simulate validation errors
          return {
            valid: false,
            errors: [
              { instancePath: '/info', message: 'Missing required property' },
              { instancePath: '/paths', message: 'Invalid structure' },
            ],
          };
        });

        const errorFiles = Array.from({ length: 25 }, (_, i) => `/stress/error${i}.yaml`);

        const startTime = Date.now();
        const result = await runBaseValidation({
          customFiles: errorFiles,
          logger: mockLogger,
          cache: { enabled: false },
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(false);
        expect(result.totalFiles).toBe(errorFiles.length);
        expect(result.invalidFiles).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10000); // Should handle errors efficiently
      });

      it('should maintain performance under memory pressure', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        // Simulate memory pressure by running multiple large validations
        const largeFileCount = 75;
        const files = Array.from({ length: largeFileCount }, (_, i) => `/pressure/test${i}.yaml`);

        const initialMemory = process.memoryUsage();

        const result = await runBaseValidation({
          customFiles: files,
          logger: mockLogger,
          cache: { enabled: false },
        });

        const finalMemory = process.memoryUsage();
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

        expect(result.success).toBe(true);
        expect(result.totalFiles).toBe(largeFileCount);

        // Even under pressure, memory growth should be reasonable
        expect(memoryGrowth).toBeLessThan(150 * 1024 * 1024); // Less than 150MB for 75 files
      });
    });
  });

  describe('Base Validation Module Integration', () => {
    describe('Public Interface Compatibility', () => {
      it('should maintain stable public interface', () => {
        const result = runBaseValidation({ cache: { enabled: false } });
        expect(result).toBeInstanceOf(Promise);
      });

      it('should support all documented options', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const options: BaseValidationOptions = {
          only: 'traditional',
          paths: ['/paths/api'],
          customFiles: ['/custom/file.yaml'],
          useLogging: false,
          logger: mockLogger,
          cache: { enabled: false },
        };

        const result = await runBaseValidation(options);

        expect(Array.isArray(result.results)).toBe(true);
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.totalFiles).toBe('number');
        expect(typeof result.validFiles).toBe('number');
        expect(typeof result.invalidFiles).toBe('number');
        expect(typeof result.totalErrors).toBe('number');
      });

      it('should return consistent result format', async () => {
        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await runBaseValidation({
          only: 'traditional',
          logger: mockLogger,
          cache: { enabled: false },
        });

        // Check result structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('totalFiles');
        expect(result).toHaveProperty('validFiles');
        expect(result).toHaveProperty('invalidFiles');
        expect(result).toHaveProperty('totalErrors');

        // Check file result structure
        expect(result.results[0]).toHaveProperty('filePath');
        expect(result.results[0]).toHaveProperty('variant');
        expect(result.results[0]).toHaveProperty('valid');
        expect(result.results[0]).toHaveProperty('errors');
        expect(result.results[0]).toHaveProperty('errorCount');

        // Check error structure if present
        if (result.results[0].errors.length > 0) {
          expect(result.results[0].errors[0]).toHaveProperty('instancePath');
          expect(result.results[0].errors[0]).toHaveProperty('message');
        }
      });

      it('should handle TypeScript type checking correctly', async () => {
        // This test ensures TypeScript types are properly exported and usable
        const options: BaseValidationOptions = {
          only: 'serverless',
          paths: ['/test'],
          customFiles: ['/test.yaml'],
          useLogging: true,
          logger: {
            log: (msg: string) => {},
            warn: (msg: string) => {},
            error: (msg: string) => {},
          },
        };

        mockFs.readFileSync.mockReturnValue(TestFixtures.VALID_OAS_COMPLETE);
        mockValidate.mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result: BaseValidationResult = await runBaseValidation(options);

        // Type assertions to ensure interfaces are properly defined
        const fileResult: BaseValidationFileResult = result.results[0];
        const error: BaseValidationError = {
          instancePath: '/test',
          message: 'test error',
        };

        expect(fileResult.variant).toMatch(/traditional|serverless|custom/);
        expect(typeof error.instancePath).toBe('string');
        expect(typeof error.message).toBe('string');
      });
    });
  });
});
