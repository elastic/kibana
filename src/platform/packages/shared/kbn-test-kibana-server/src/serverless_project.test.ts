/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getServerlessProject } from './serverless_project';

const securityProductTypes = (
  productTypes: Array<{ product_line: string; product_tier: string }>
) => `--xpack.securitySolutionServerless.productTypes=${JSON.stringify(productTypes)}`;

const obltProducts = (tier: string) =>
  `--pricing.tiers.products=${JSON.stringify([{ name: 'observability', tier }])}`;

describe('getServerlessProject', () => {
  it.each([[[]], [['--serverless']], [['--no-serverless']], [['--serverless=unsupported']]])(
    'returns undefined for %j',
    (serverArgs) => {
      expect(getServerlessProject(serverArgs)).toBeUndefined();
    }
  );

  it.each([['es'], ['workplaceai'], ['vectordb']])(
    'reads the %s project without a tier',
    (projectType) => {
      expect(
        getServerlessProject([`--serverless=${projectType}`, obltProducts('logs_essentials')])
      ).toEqual({
        projectType,
      });
    }
  );

  it('defaults security and oblt projects to the complete tier', () => {
    expect(getServerlessProject(['--serverless=security'])).toEqual({
      projectType: 'security',
      productTier: 'complete',
    });
    expect(getServerlessProject(['--serverless=oblt'])).toEqual({
      projectType: 'oblt',
      productTier: 'complete',
    });
  });

  it('reads the observability pricing tier', () => {
    expect(getServerlessProject(['--serverless=oblt', obltProducts('logs_essentials')])).toEqual({
      projectType: 'oblt',
      productTier: 'logs_essentials',
    });
  });

  it('prefers the security product line', () => {
    const serverArgs = [
      '--serverless=security',
      securityProductTypes([
        { product_line: 'endpoint', product_tier: 'complete' },
        { product_line: 'security', product_tier: 'essentials' },
      ]),
    ];
    expect(getServerlessProject(serverArgs)).toEqual({
      projectType: 'security',
      productTier: 'essentials',
    });
  });

  it('falls back to the first security product line', () => {
    const serverArgs = [
      '--serverless=security',
      securityProductTypes([{ product_line: 'ai_soc', product_tier: 'search_ai_lake' }]),
    ];
    expect(getServerlessProject(serverArgs)).toEqual({
      projectType: 'security',
      productTier: 'search_ai_lake',
    });
  });

  it('uses the last value when an argument is repeated', () => {
    const serverArgs = [
      '--serverless=es',
      '--serverless=oblt',
      obltProducts('complete'),
      obltProducts('logs_essentials'),
    ];
    expect(getServerlessProject(serverArgs)).toEqual({
      projectType: 'oblt',
      productTier: 'logs_essentials',
    });
  });

  it('defaults to the complete tier for unparsable tiers', () => {
    expect(getServerlessProject(['--serverless=oblt', '--pricing.tiers.products=nope'])).toEqual({
      projectType: 'oblt',
      productTier: 'complete',
    });
  });

  it('omits unknown tiers', () => {
    expect(getServerlessProject(['--serverless=oblt', obltProducts('platinum')])).toEqual({
      projectType: 'oblt',
    });
  });

  it('throws for invalid Kibana CLI arguments', () => {
    expect(() => getServerlessProject(['serverless=oblt'])).toThrow(/invalid CLI arg/);
  });
});
