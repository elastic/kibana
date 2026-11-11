/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTriggerSchema } from '.';
import {
  DEFAULT_PAGE_TRIGGER_ID,
  MULTIPLE_PAGE_TRIGGERS_ERROR,
  PAGE_TRIGGER_ID_ERROR,
  PageTriggerSchema,
} from './page_trigger_schema';
import { generateLightweightYamlSchema } from '../../lib/generate_yaml_schema_from_connectors';
import { WorkflowSchema } from '../../schema';

const pageInputs = {
  properties: { summary: { type: 'string' } },
  required: ['summary'],
};

const workflowWith = (triggers: unknown[]) => ({
  name: 'page workflow',
  triggers,
  steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
});

describe('PageTriggerSchema', () => {
  it('accepts a page trigger with a title, description, id, and inputs', () => {
    const result = PageTriggerSchema.safeParse({
      type: 'page',
      id: 'report-incident',
      title: 'Report an incident',
      description: 'Tell us what happened',
      inputs: pageInputs,
    });

    expect(result.success).toBe(true);
  });

  it('sets the default page id when the id is omitted', () => {
    expect(PageTriggerSchema.parse({ type: 'page', title: 'Page' }).id).toBe(
      DEFAULT_PAGE_TRIGGER_ID
    );
    expect(PageTriggerSchema.parse({ type: 'page', title: 'Page', id: 'intake' }).id).toBe(
      'intake'
    );
  });

  it('requires a non-empty title', () => {
    expect(PageTriggerSchema.safeParse({ type: 'page' }).success).toBe(false);
    expect(PageTriggerSchema.safeParse({ type: 'page', title: '   ' }).success).toBe(false);
  });

  it.each(['Default', '-page', 'my page', 'a'.repeat(65)])('rejects the page id "%s"', (id) => {
    const result = PageTriggerSchema.safeParse({ type: 'page', title: 'Page', id });

    expect(result.success).toBe(false);
  });

  it('explains the allowed page id characters', () => {
    const result = PageTriggerSchema.safeParse({ type: 'page', title: 'Page', id: 'My Page' });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({ message: PAGE_TRIGGER_ID_ERROR, path: ['id'] }),
    ]);
  });

  it('rejects legacy array inputs', () => {
    const result = PageTriggerSchema.safeParse({
      type: 'page',
      title: 'Page',
      inputs: [{ name: 'summary', type: 'string' }],
    });

    expect(result.success).toBe(false);
  });
});

describe('page trigger switch (workflowsManagement.pages.enabled)', () => {
  const pageWorkflow = workflowWith([{ type: 'page', title: 'Page' }]);

  it('leaves the page trigger out of a generated schema by default', () => {
    expect(getTriggerSchema().safeParse({ type: 'page', title: 'Page' }).success).toBe(false);
    expect(generateLightweightYamlSchema().safeParse(pageWorkflow).success).toBe(false);
  });

  it('includes the page trigger with includePageTrigger', () => {
    const options = { includePageTrigger: true };

    expect(getTriggerSchema([], options).safeParse({ type: 'page', title: 'Page' }).success).toBe(
      true
    );
    expect(
      getTriggerSchema(['cases.updated'], options).safeParse({ type: 'page', title: 'Page' })
        .success
    ).toBe(true);
    expect(generateLightweightYamlSchema([], options).safeParse(pageWorkflow).success).toBe(true);
  });
});

describe.each([
  ['WorkflowSchema', WorkflowSchema],
  [
    'generateLightweightYamlSchema',
    generateLightweightYamlSchema([], { includePageTrigger: true }),
  ],
])('page triggers in %s', (_name, schema) => {
  it('accepts one page trigger next to other triggers', () => {
    const result = schema.safeParse(
      workflowWith([{ type: 'manual' }, { type: 'page', title: 'Page', inputs: pageInputs }])
    );

    expect(result.success).toBe(true);
  });

  it('rejects a second page trigger', () => {
    const result = schema.safeParse(
      workflowWith([
        { type: 'page', title: 'First' },
        { type: 'page', title: 'Second', id: 'second' },
      ])
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ message: MULTIPLE_PAGE_TRIGGERS_ERROR, path: ['triggers', 1] }),
    ]);
  });

  it('accepts separate inputs on the page and the manual trigger', () => {
    const result = schema.safeParse(
      workflowWith([
        { type: 'manual', inputs: { properties: { priority: { type: 'string' } } } },
        { type: 'page', title: 'Page', inputs: pageInputs },
      ])
    );

    expect(result.success).toBe(true);
  });
});
