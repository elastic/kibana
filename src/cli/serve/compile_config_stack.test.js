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

  it.each(['search_ai_lake', 'essentials', 'complete'])(
    'adds all `security` %s tier config to the stack',
    async (productTier) => {
      getConfigFromFiles.mockImplementationOnce(() => {
        return {
          xpack: {
            securitySolutionServerless: {
              enabled: true,
              productTypes: [
                {
                  product_line: 'security',
                  product_tier: productTier,
                },
              ],
            },
          },
        };
      });
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
        `serverless.security.${productTier}.yml`,
        `serverless.security.${productTier}.dev.yml`,
      ]);
    }
  );

  it.each(['search_ai_lake', 'essentials', 'complete'])(
    'adds all `security` %s tier config to the stack (when coming from CLI options)',
    async (productTier) => {
      const configList = compileConfigStack({
        serverless: 'security',
        dev: true,
        unknownOptions: {
          xpack: {
            securitySolutionServerless: {
              productTypes: [
                {
                  product_tier: productTier,
                },
              ],
            },
          },
        },
      }).map(toFileNames);

      expect(configList).toEqual([
        'serverless.yml',
        'serverless.security.yml',
        'kibana.yml',
        'kibana.dev.yml',
        'serverless.dev.yml',
        'serverless.security.dev.yml',
        `serverless.security.${productTier}.yml`,
        `serverless.security.${productTier}.dev.yml`,
      ]);
    }
  );

  it('adds no additional `security` tier config to the stack when no product tier', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        xpack: {
          securitySolutionServerless: {
            enabled: true,
            productTypes: [
              {
                product_line: 'security',
              },
            ],
          },
        },
      };
    });
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

describe('pricing tiers configuration', () => {
  it('adds pricing tier config to the stack when pricing.tiers.enabled is true', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        pricing: {
          tiers: {
            enabled: true,
            products: [{ name: 'observability', tier: 'logs_essentials' }],
          },
        },
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.oblt.logs_essentials.yml',
    ]);
  });

  it('adds pricing tier config with dev mode when pricing.tiers.enabled is true', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        pricing: {
          tiers: {
            enabled: true,
            products: [{ name: 'observability', tier: 'complete' }],
          },
        },
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
      dev: true,
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
      'serverless.oblt.dev.yml',
      'serverless.oblt.complete.yml',
      'serverless.oblt.complete.dev.yml',
    ]);
  });

  it('adds pricing tier config from unknownOptions when pricing.tiers.enabled is true', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
      unknownOptions: {
        pricing: {
          tiers: {
            enabled: true,
            products: [{ name: 'observability', tier: 'logs_essentials' }],
          },
        },
      },
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.oblt.logs_essentials.yml',
    ]);
  });

  it('adds pricing tier config from unknownOptions with dev mode when pricing.tiers.enabled is true', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
      dev: true,
      unknownOptions: {
        pricing: {
          tiers: {
            enabled: true,
            products: [{ name: 'observability', tier: 'complete' }],
          },
        },
      },
    }).map(toFileNames);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
      'serverless.oblt.dev.yml',
      'serverless.oblt.complete.yml',
      'serverless.oblt.complete.dev.yml',
    ]);
  });

  it('does not add pricing tier config when pricing.tiers.enabled is false', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        pricing: {
          tiers: {
            enabled: false,
            products: [{ name: 'observability', tier: 'logs_essentials' }],
          },
        },
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
    }).map(toFileNames);

    expect(configList).toEqual(['serverless.yml', 'serverless.oblt.yml', 'kibana.yml']);
  });

  it('does not add pricing tier config when pricing.tiers.enabled is true but no tier is specified', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        pricing: {
          tiers: {
            enabled: true,
            products: [],
          },
        },
        serverless: 'oblt',
      };
    });

    const configList = compileConfigStack({
      serverless: 'oblt',
    }).map(toFileNames);

    expect(configList).toEqual(['serverless.yml', 'serverless.oblt.yml', 'kibana.yml']);
  });

  it('throws an error when multiple different tiers are specified', async () => {
    getConfigFromFiles.mockImplementationOnce(() => {
      return {
        pricing: {
          tiers: {
            enabled: true,
            products: [
              { name: 'observability', tier: 'complete' },
              { name: 'observability', tier: 'logs_essentials' },
            ],
          },
        },
        serverless: 'oblt',
      };
    });

    expect(() => {
      compileConfigStack({
        serverless: 'oblt',
      });
    }).toThrow(
      'Multiple tiers found in pricing.tiers.products, the applied tier should be the same for all the products.'
    );
  });
});

function toFileNames(path) {
  return Path.basename(path);
}
