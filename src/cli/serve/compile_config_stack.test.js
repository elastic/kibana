/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

jest.mock('fs');
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/some/imaginary/path',
}));
jest.mock('@kbn/config');

import { statSync } from 'fs';
import { getConfigFromFiles } from '@kbn/config';

import { compileConfigStack } from './compile_config_stack';

describe('compileConfigStack', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    statSync.mockImplementation(() => {
      return {
        isFile: () => true,
      };
    });

    getConfigFromFiles.mockImplementation(() => {
      return {};
    });
  });

  it('loads default config set without any options', () => {
    const configList = compileConfigStack({}).map(toFileNames);

    expect(configList).toEqual(['kibana.yml']);
  });

  it('loads serverless configs when --serverless is set', async () => {
    const configList = compileConfigStack({
      serverless: 'oblt',
    }).map(toFileNames);

    expect(configList).toEqual(['serverless.yml', 'serverless.oblt.yml', 'kibana.yml']);
  });

  it('prefers --config options over default', async () => {
    const configList = compileConfigStack({
      configOverrides: ['my-config.yml'],
      serverless: 'oblt',
    }).map(toFileNames);

    expect(configList).toEqual(['serverless.yml', 'serverless.oblt.yml', 'my-config.yml']);
  });

  it('adds dev configs to the stack', async () => {
    const configList = compileConfigStack({
      serverless: 'security',
      dev: true,
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.security.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
      'serverless.security.dev.yml',
    ]);
  });

  it('defaults to "es" if --serverless and --dev are there', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        serverless: 'es',
      };
    });

    const configList = compileConfigStack({
      dev: true,
      serverless: true,
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.es.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
      'serverless.es.dev.yml',
    ]);
  });
});

function toFileNames(path) {
  return Path.basename(path);
}
