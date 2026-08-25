/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identifyDependencyUsageWithCruiser } from './dependency_graph/providers/cruiser.ts';
import { configureYargs } from './cli';

jest.mock('chalk', () => ({
  green: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  magenta: jest.fn((str) => str),
  blue: jest.fn((str) => str),
  bold: { magenta: jest.fn((str) => str), blue: jest.fn((str) => str) },
}));

jest.mock('./dependency_graph/providers/cruiser', () => ({
  identifyDependencyUsageWithCruiser: jest.fn(),
}));

jest.mock('./cli', () => ({
  ...jest.requireActual('./cli'),
  runCLI: jest.fn(),
}));

describe('dependency-usage CLI', () => {
  const parser = configureYargs()
    .fail((message: string) => {
      throw new Error(message);
    })
    .exitProcess(false);

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should handle verbose option', () => {
    const argv = parser.parse(['--paths', './plugins', '--verbose']);
    expect(argv.verbose).toBe(true);

    expect(identifyDependencyUsageWithCruiser).toHaveBeenCalledWith(
      expect.any(Array),
      undefined,
      expect.objectContaining({ isVerbose: true })
    );
  });

  it('should group results by specified group-by option', () => {
    const argv = parser.parse(['--paths', './src', '--group-by', 'owner']);
    expect(argv['group-by']).toBe('owner');

    expect(identifyDependencyUsageWithCruiser).toHaveBeenCalledWith(
      expect.any(Array),
      undefined,
      expect.objectContaining({ groupBy: 'owner' })
    );
  });

  it('should use default values when optional arguments are not provided', () => {
    const argv = parser.parse([]);
    expect(argv.paths).toEqual(['.']);
    expect(argv['dependency-name']).toBeUndefined();
    expect(argv['collapse-depth']).toBe(1);
    expect(argv.verbose).toBe(false);
  });

  it('should throw an error if summary is used without dependency-name', () => {
    expect(() => {
      parser.parse(['--summary', '--paths', './src']);
    }).toThrow('Summary option can only be used when a dependency name is provided');
  });

  it('should validate collapse-depth as a positive integer', () => {
    expect(() => {
      parser.parse(['--paths', './src', '--collapse-depth', '0']);
    }).toThrow('Collapse depth must be a positive integer');
  });

  it('should output results to specified output path', () => {
    const argv = parser.parse(['--paths', './src', '--output-path', './output.json']);
    expect(argv['output-path']).toBe('./output.json');
  });

  it('should print results to console if no output path is specified', () => {
    const argv = parser.parse(['--paths', './src']);
    expect(argv['output-path']).toBeUndefined();
  });
});
