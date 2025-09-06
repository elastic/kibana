/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCLICommands, runOASValidationCLI } from './cli_commands';

describe('CLI Commands', () => {
  describe('createCLICommands', () => {
    it('should create base and enhanced commands', () => {
      const commands = createCLICommands();

      expect(commands).toHaveLength(2);
      expect(commands[0].name).toBe('base');
      expect(commands[1].name).toBe('enhanced');
    });

    it('should have proper command structure for base command', () => {
      const commands = createCLICommands();
      const baseCommand = commands[0];

      expect(baseCommand).toEqual({
        name: 'base',
        description:
          'Run basic OAS validation with enhanced CLI features (recommended migration from legacy)',
        usage: 'node scripts/validate_oas_docs.js base [options]',
        flags: expect.objectContaining({
          string: ['path', 'only'],
          help: expect.stringContaining('--path'),
        }),
        run: expect.any(Function),
      });
    });

    it('should have proper command structure for enhanced command', () => {
      const commands = createCLICommands();
      const enhancedCommand = commands[1];

      expect(enhancedCommand).toEqual({
        name: 'enhanced',
        description:
          'Run enhanced OAS validation with advanced features (JSON output, incremental validation, etc.)',
        usage: 'node scripts/validate_oas_docs.js enhanced [options]',
        flags: expect.objectContaining({
          string: ['path', 'only', 'format'],
          boolean: ['incremental', 'force'],
          help: expect.stringContaining('--incremental'),
        }),
        run: expect.any(Function),
      });
    });
  });

  describe('runOASValidationCLI', () => {
    it('should be a function', () => {
      expect(typeof runOASValidationCLI).toBe('function');
    });
  });
});
