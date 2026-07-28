/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as allSpecs from '../all_specs';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
// resolveJsonModule is enabled in tsconfig.base.json
import committedManifest from '../../connector_execution_manifest.json';
import {
  buildConnectorManifest,
  buildExecutionSurface,
  computeFingerprint,
} from './connector_execution_manifest';

const baseSpec: ConnectorSpec = {
  metadata: {
    id: '.manifest-test',
    displayName: 'Manifest test',
    description: 'Manifest test connector',
    minimumLicense: 'basic',
    supportedFeatureIds: [],
  },
  auth: {
    types: [{ type: 'bearer', defaults: { token: 'default-token' } }],
    headers: { 'x-connector': 'test' },
  },
  schema: z.object({ url: z.string() }),
  actions: {
    run: {
      input: z.object({ value: z.string() }),
      output: z.object({ result: z.string() }),
      error: z.object({ message: z.string() }),
      responseSizeHeader: 'x-response-size',
      handler: async (_ctx, input) => ({ result: input.value }),
    },
  },
  test: {
    enabled: true,
    handler: async () => ({ ok: true }),
  },
};

const fingerprint = (spec: ConnectorSpec) => computeFingerprint(buildExecutionSurface(spec));

describe('connector_execution_manifest.json', () => {
  it('is up to date with current specs (re-generate with: node scripts/generate_connector_manifest)', () => {
    const specs = Object.values(allSpecs) as ConnectorSpec[];
    const generated = buildConnectorManifest(specs);
    expect(generated).toEqual(committedManifest);
  });

  it('captures the generated validation and implementation surface', () => {
    const surface = buildExecutionSurface(baseSpec);

    expect(surface).toEqual(
      expect.objectContaining({
        configSchema: expect.objectContaining({
          properties: expect.objectContaining({ authType: expect.any(Object) }),
        }),
        auth: [
          expect.objectContaining({
            id: 'bearer',
            configureSource: expect.stringContaining('async'),
          }),
        ],
        actions: expect.objectContaining({
          run: expect.objectContaining({
            error: expect.any(Object),
            handlerSource: expect.stringContaining('input.value'),
            responseSizeHeader: 'x-response-size',
          }),
          _test: expect.objectContaining({ handlerSource: expect.any(String) }),
        }),
      })
    );
  });

  it('changes when execution implementation or behavior changes', () => {
    const changedHandler: ConnectorSpec = {
      ...baseSpec,
      actions: {
        ...baseSpec.actions,
        run: {
          ...baseSpec.actions.run,
          handler: async (_ctx, input) => ({ result: input.value.toUpperCase() }),
        },
      },
    };
    const changedResponseHeader: ConnectorSpec = {
      ...baseSpec,
      actions: {
        ...baseSpec.actions,
        run: {
          ...baseSpec.actions.run,
          responseSizeHeader: 'x-different-size',
        },
      },
    };

    expect(fingerprint(changedHandler)).not.toBe(fingerprint(baseSpec));
    expect(fingerprint(changedResponseHeader)).not.toBe(fingerprint(baseSpec));
  });

  it('does not include supportedFeatureIds in the execution fingerprint', () => {
    const featureEnabled: ConnectorSpec = {
      ...baseSpec,
      metadata: { ...baseSpec.metadata, supportedFeatureIds: ['workflows'] },
    };

    expect(fingerprint(featureEnabled)).toBe(fingerprint(baseSpec));
  });
});
