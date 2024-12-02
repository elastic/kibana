/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureYargs } from './cli';
import { identifyDependencyOwnership } from './dependency_ownership';

jest.mock('chalk', () => ({
  green: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  magenta: jest.fn((str) => str),
  blue: jest.fn((str) => str),
  bold: { magenta: jest.fn((str) => str), blue: jest.fn((str) => str) },
}));

jest.mock('./dependency_ownership', () => ({
  identifyDependencyOwnership: jest.fn(),
}));

jest.mock('./cli', () => ({
  ...jest.requireActual('./cli'),
  runCLI: jest.fn(),
}));

describe('dependency-ownership CLI', () => {
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

  it('should parse the dependency option correctly', () => {
    const argv = parser.parse(['--dependency', 'lodash']);
    expect(argv).toMatchObject({
      dependency: 'lodash',
    });

    expect(identifyDependencyOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ dependency: 'lodash' })
    );
  });

  it('should parse the owner option correctly', () => {
    const argv = parser.parse(['--owner', '@elastic/kibana-core']);
    expect(argv).toMatchObject({
      owner: '@elastic/kibana-core',
    });

    expect(identifyDependencyOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ owner: '@elastic/kibana-core' })
    );
  });

  it('should parse the missing-owner option correctly', () => {
    const argv = parser.parse(['--missing-owner']);
    expect(argv).toMatchObject({
      missingOwner: true,
    });

    expect(identifyDependencyOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ missingOwner: true })
    );
  });

  it('should parse the output-path option correctly', () => {
    const argv = parser.parse([
      '--output-path',
      './output.json',
      '--owner',
      '@elastic/kibana-core',
    ]);

    expect(argv).toMatchObject({
      owner: '@elastic/kibana-core',
      outputPath: './output.json',
    });

    expect(identifyDependencyOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ owner: '@elastic/kibana-core' })
    );
  });

  it('should support aliases for options', () => {
    const argv1 = parser.parse(['-d', 'lodash', '-f', './out.json']);
    expect(argv1).toMatchObject({
      dependency: 'lodash',
      outputPath: './out.json',
    });

    const argv2 = parser.parse(['-o', '@elastic/kibana-core', '-f', './out.json']);

    expect(argv2).toMatchObject({
      owner: '@elastic/kibana-core',
      outputPath: './out.json',
    });
  });

  it('should throw an error for invalid flag combinations', () => {
    expect(() => {
      parser.parse(['--dependency', 'lodash', '--missing-owner']);
    }).toThrow('You must provide either a dependency, owner, or missingOwner flag to search for');

    expect(identifyDependencyOwnership).not.toHaveBeenCalled();
  });
});
