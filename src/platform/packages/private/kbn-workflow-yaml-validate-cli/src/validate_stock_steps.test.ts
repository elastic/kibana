/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isPackageWorkflowPath,
  isStockWorkflowStepType,
  validateStockWorkflowSteps,
} from './validate_stock_steps';

describe('validateStockWorkflowSteps', () => {
  describe('isPackageWorkflowPath', () => {
    it.each(['/tmp/pkg-1.0.0/kibana/workflow/catalog.yaml', 'pkg\\kibana\\workflow\\catalog.yml'])(
      'recognizes package workflow path %s',
      (file) => {
        expect(isPackageWorkflowPath(file)).toBe(true);
      }
    );

    it.each([
      '/tmp/workflow-library/templates/catalog.yaml',
      '/tmp/pkg/kibana/workflows/catalog.yaml',
      '/tmp/pkg/kibana/dashboard/catalog.ndjson',
    ])('rejects non-package path %s', (file) => {
      expect(isPackageWorkflowPath(file)).toBe(false);
    });
  });

  it.each([
    'console',
    'foreach',
    'while',
    'data.set',
    'workflow.execute',
    'elasticsearch.search',
    'kibana.request',
    'github.runQueryTemplate',
  ])('recognizes %s as a stock step', (type) => {
    expect(isStockWorkflowStepType(type)).toBe(true);
  });

  it('rejects a product-owned custom step', () => {
    expect(
      validateStockWorkflowSteps({
        steps: [{ name: 'send', type: 'security.sendResponseAction' }],
      })
    ).toEqual([
      expect.objectContaining({
        source: 'stock-step',
        path: 'steps.0.type',
        message: expect.stringContaining('security.sendResponseAction'),
      }),
    ]);
  });

  it('recursively rejects custom steps in every control-flow container', () => {
    const issuePaths = validateStockWorkflowSteps({
      steps: [
        {
          name: 'conditional',
          type: 'if',
          steps: [{ name: 'true', type: 'product.true' }],
          else: [{ name: 'false', type: 'product.false' }],
          'on-failure': { fallback: [{ name: 'fallback', type: 'product.fallback' }] },
        },
        {
          name: 'switch',
          type: 'switch',
          cases: [{ condition: 'true', steps: [{ name: 'case', type: 'product.case' }] }],
        },
        {
          name: 'parallel',
          type: 'parallel',
          branches: [{ steps: [{ name: 'branch', type: 'product.branch' }] }],
        },
      ],
    }).map((issue) => issue.path);

    expect(issuePaths).toEqual([
      'steps.0.steps.0.type',
      'steps.0.else.0.type',
      'steps.0.on-failure.fallback.0.type',
      'steps.1.cases.0.steps.0.type',
      'steps.2.branches.0.steps.0.type',
    ]);
  });

  it('returns no issues for the stock-step ETL shape', () => {
    expect(
      validateStockWorkflowSteps({
        steps: [
          { name: 'checkpoint', type: 'elasticsearch.search' },
          {
            name: 'pages',
            type: 'while',
            steps: [
              { name: 'query', type: 'github.runQueryTemplate' },
              { name: 'pace', type: 'wait' },
              {
                name: 'repos',
                type: 'foreach',
                steps: [{ name: 'persist', type: 'elasticsearch.index' }],
              },
              { name: 'advance', type: 'data.set' },
            ],
          },
        ],
      })
    ).toEqual([]);
  });
});
