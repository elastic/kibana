/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { getPanelSchema } from './dashboard_state_schemas';

const vegaConfigSchema = z
  .object({
    spec: z.string().min(1),
  })
  .strip();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../kibana_services').embeddableService = {
    getAllEmbeddableSchemas: jest.fn().mockReturnValue({
      vega: { title: 'Vega', schema: vegaConfigSchema },
    }),
  };
});

describe('getPanelSchema', () => {
  test('includes a type: vega member when vega schema is registered', () => {
    const schema = getPanelSchema();

    expect(
      schema.parse({
        type: 'vega',
        grid: { x: 0, y: 0, w: 24, h: 15 },
        config: { spec: '{ mark: point }' },
      })
    ).toMatchObject({
      type: 'vega',
      config: { spec: '{ mark: point }' },
    });
  });

  test('rejects vega panels missing spec', () => {
    const schema = getPanelSchema();
    expect(() =>
      schema.parse({
        type: 'vega',
        grid: { x: 0, y: 0, w: 24, h: 15 },
        config: {},
      })
    ).toThrow();
  });
});
