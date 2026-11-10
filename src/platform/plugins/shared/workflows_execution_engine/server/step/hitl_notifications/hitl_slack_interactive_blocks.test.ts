/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HITL_SLACK_ACTION_APPROVE, HITL_SLACK_ACTION_SUBMIT } from '@kbn/workflows';
import {
  buildHitlSlackApprovalBlocks,
  buildHitlSlackInputBlocksFromSchema,
} from './hitl_slack_interactive_blocks';

const resume = {
  executionId: 'exec-1',
  stepId: 'step-1',
  token: 'token-1',
  spaceId: 'default',
};

describe('hitl_slack_interactive_blocks', () => {
  it('builds approve/decline actions with correlation values', () => {
    const blocks = buildHitlSlackApprovalBlocks({
      message: 'Please approve',
      approveLabel: 'Approve',
      rejectLabel: 'Decline',
      resume,
    });
    expect(blocks[0]).toMatchObject({ type: 'section' });
    const actions = blocks[1] as {
      type: string;
      elements: Array<{ action_id: string; value: string }>;
    };
    expect(actions.type).toBe('actions');
    expect(actions.elements[0]?.action_id).toBe(HITL_SLACK_ACTION_APPROVE);
    expect(actions.elements[0]?.value).toContain('"k":"a"');
  });

  it('flattens waitForInput schema into input blocks plus submit', () => {
    const blocks = buildHitlSlackInputBlocksFromSchema({
      message: 'Fill in',
      schema: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', title: 'Reason' },
          approved: { type: 'boolean' },
        },
      },
      resume,
    });
    expect(blocks.some((block) => block.type === 'input')).toBe(true);
    const actions = blocks[blocks.length - 1] as {
      elements: Array<{ action_id: string }>;
    };
    expect(actions.elements[0]?.action_id).toBe(HITL_SLACK_ACTION_SUBMIT);
  });

  it('renders an array of string enums as a multi-select and other arrays as text', () => {
    const blocks = buildHitlSlackInputBlocksFromSchema({
      message: '',
      schema: {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string', enum: ['red', 'blue'] } },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
      resume,
    });
    const inputs = blocks.filter((block) => block.type === 'input') as Array<{
      element: { type: string; options?: Array<{ value: string }> };
    }>;

    expect(inputs[0]?.element).toMatchObject({
      type: 'multi_static_select',
      action_id: 'tags',
      options: [{ value: 'red' }, { value: 'blue' }],
    });
    expect(inputs[1]?.element.type).toBe('plain_text_input');
  });
});
