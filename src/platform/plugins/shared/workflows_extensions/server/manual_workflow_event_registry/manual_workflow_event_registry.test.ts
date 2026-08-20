/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ServerManualWorkflowEventRegistry } from './manual_workflow_event_registry';
import type { ManualWorkflowEventDefinition } from '../../common';

const createDefinition = (
  overrides: Partial<ManualWorkflowEventDefinition> = {}
): ManualWorkflowEventDefinition => ({
  id: 'cases.updated',
  eventSchema: z.object({ caseId: z.string() }),
  title: 'Case updated',
  description: 'A case was updated.',
  ...overrides,
});

describe('ServerManualWorkflowEventRegistry', () => {
  let registry: ServerManualWorkflowEventRegistry;

  beforeEach(() => {
    registry = new ServerManualWorkflowEventRegistry();
  });

  it('registers and reads a valid definition', () => {
    const definition = createDefinition();
    registry.register(definition);

    expect(registry.has(definition.id)).toBe(true);
    expect(registry.get(definition.id)).toBe(definition);
    expect(registry.list()).toEqual([definition]);
  });

  it('rejects duplicate ids', () => {
    registry.register(createDefinition());

    expect(() => registry.register(createDefinition())).toThrow(
      'Manual workflow event "cases.updated" is already registered'
    );
  });

  it.each([
    ['an invalid id', { id: 'invalid' }, 'must follow namespaced format'],
    ['a non-object event schema', { eventSchema: z.string() }, 'must be a Zod object schema'],
    ['an empty title', { title: '' }, '"title" must be a non-empty string'],
    ['an empty description', { description: '' }, '"description" must be a non-empty string'],
  ])('rejects %s', (_name, overrides, message) => {
    expect(() => registry.register(createDefinition(overrides))).toThrow(message);
  });

  it('freezes registrations while preserving reads', () => {
    const definition = createDefinition();
    registry.register(definition);
    registry.freeze();

    expect(registry.get(definition.id)).toBe(definition);
    expect(() => registry.register(createDefinition({ id: 'cases.created' }))).toThrow(
      'only allowed during plugin setup'
    );
  });
});
