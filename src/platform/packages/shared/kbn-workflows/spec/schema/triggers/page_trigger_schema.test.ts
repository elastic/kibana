/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MULTIPLE_PAGE_TRIGGERS_ERROR, PageTriggerSchema } from './page_trigger_schema';
import { WorkflowSchema } from '../../schema';

const workflowWith = (triggers: unknown[]) => ({
  name: 'page workflow',
  triggers,
  steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
});

describe('PageTriggerSchema', () => {
  it('does not accept a page-id: the page URL is not part of the YAML', () => {
    const result = PageTriggerSchema.strict().safeParse({ type: 'page', 'page-id': 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('page triggers per workflow', () => {
  it('accepts one page trigger next to other triggers', () => {
    const result = WorkflowSchema.safeParse(workflowWith([{ type: 'manual' }, { type: 'page' }]));
    expect(result.success).toBe(true);
  });

  it('rejects a second page trigger', () => {
    const result = WorkflowSchema.safeParse(workflowWith([{ type: 'page' }, { type: 'page' }]));
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(MULTIPLE_PAGE_TRIGGERS_ERROR);
  });
});
