/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { PublicManualWorkflowEventRegistry } from './manual_workflow_event_registry';
import type { ManualWorkflowEventDefinition } from '../../common';

const definition: ManualWorkflowEventDefinition = {
  id: 'cases.updated',
  eventSchema: z.object({ caseId: z.string() }),
  title: 'Case updated',
  description: 'A case was updated.',
};

describe('PublicManualWorkflowEventRegistry', () => {
  let registry: PublicManualWorkflowEventRegistry;

  beforeEach(() => {
    registry = new PublicManualWorkflowEventRegistry();
  });

  it('registers and reads a valid definition', () => {
    registry.register(definition);

    expect(registry.has(definition.id)).toBe(true);
    expect(registry.get(definition.id)).toBe(definition);
    expect(registry.getAll()).toEqual([definition]);
  });

  it('rejects duplicate ids', () => {
    registry.register(definition);

    expect(() => registry.register({ ...definition })).toThrow(
      'Manual workflow event "cases.updated" is already registered'
    );
  });

  it('validates definitions', () => {
    expect(() => registry.register({ ...definition, id: 'invalid' })).toThrow(
      'must follow namespaced format'
    );
  });

  it('loads async definitions when ready', async () => {
    const loader = jest.fn().mockResolvedValue(definition);
    registry.register(loader);

    expect(loader).not.toHaveBeenCalled();
    expect(registry.has(definition.id)).toBe(false);

    await registry.whenReady();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(registry.get(definition.id)).toBe(definition);
  });

  it('allows setup-time loaders to settle after freeze and blocks later registration', async () => {
    registry.register(() => Promise.resolve(definition));
    registry.freeze();

    expect(() => registry.register({ ...definition, id: 'cases.created' })).toThrow(
      'only allowed during plugin setup'
    );
    await expect(registry.whenReady()).resolves.toBeUndefined();
    expect(registry.get(definition.id)).toBe(definition);
  });
});
