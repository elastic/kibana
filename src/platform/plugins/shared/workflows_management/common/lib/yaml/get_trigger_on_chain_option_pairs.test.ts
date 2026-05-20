/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScalar, parseDocument } from 'yaml';
import { resolveWorkflowEventsModeFromOn } from '@kbn/workflows-execution-engine/server';
import { getTriggerNodes } from './get_trigger_nodes';
import { getTriggerOnChainOptionPairs } from './get_trigger_on_chain_option_pairs';

function onBlockFromTriggerJson(trigger: Record<string, unknown>): Record<string, unknown> | null {
  if (
    !('on' in trigger) ||
    trigger.on == null ||
    typeof trigger.on !== 'object' ||
    Array.isArray(trigger.on)
  ) {
    return null;
  }
  return trigger.on as Record<string, unknown>;
}

describe('getTriggerOnChainOptionPairs', () => {
  it('returns workflowEvents pair when set to allow-all', () => {
    const doc = parseDocument(
      `triggers:
  - type: example.loopTrigger
    on:
      workflowEvents: allow-all
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    const pairs = getTriggerOnChainOptionPairs(first.node);
    expect(pairs).toHaveLength(1);
    const pair = pairs[0];
    expect(pair).toBeDefined();
    if (!pair) {
      return;
    }
    expect(isScalar(pair.key) && pair.key.value).toBe('workflowEvents');
    expect(isScalar(pair.value) && pair.value.value).toBe('allow-all');
  });

  it('returns workflowEvents pair when set to ignore', () => {
    const doc = parseDocument(
      `triggers:
  - type: example.loopTrigger
    on:
      workflowEvents: ignore
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    const pairs = getTriggerOnChainOptionPairs(first.node);
    expect(pairs).toHaveLength(1);
    const pair = pairs[0];
    expect(pair).toBeDefined();
    if (!pair) {
      return;
    }
    expect(isScalar(pair.key) && pair.key.value).toBe('workflowEvents');
    expect(isScalar(pair.value) && pair.value.value).toBe('ignore');
  });

  it('under %YAML 1.1 still finds on when plain on is resolved to boolean true', () => {
    const doc = parseDocument(
      `%YAML 1.1
---
triggers:
  - type: example.loopTrigger
    on:
      workflowEvents: ignore
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    const pairs = getTriggerOnChainOptionPairs(first.node);
    expect(pairs).toHaveLength(1);
  });

  it('under %YAML 1.1 does not treat yes (also boolean true) as the on map', () => {
    const doc = parseDocument(
      `%YAML 1.1
---
triggers:
  - type: example.loopTrigger
    yes:
      workflowEvents: ignore
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    expect(getTriggerOnChainOptionPairs(first.node)).toHaveLength(0);
  });

  it('returns workflowEvents pair when set to avoid-loop', () => {
    const doc = parseDocument(
      `triggers:
  - type: example.loopTrigger
    on:
      workflowEvents: avoid-loop
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    const pairs = getTriggerOnChainOptionPairs(first.node);
    expect(pairs).toHaveLength(1);
    const pair = pairs[0];
    expect(pair).toBeDefined();
    if (!pair) {
      return;
    }
    expect(isScalar(pair.value) && pair.value.value).toBe('avoid-loop');
  });

  it('returns no pair when workflowEvents is an unknown string', () => {
    const doc = parseDocument(
      `triggers:
  - type: example.loopTrigger
    on:
      workflowEvents: maybeLater
`
    );
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    expect(getTriggerOnChainOptionPairs(first.node)).toHaveLength(0);
  });

  it.each([
    {
      name: 'no on block',
      yaml: `triggers:
  - type: example.loopTrigger
`,
    },
    {
      name: 'on without workflowEvents',
      yaml: `triggers:
  - type: example.loopTrigger
    on:
      condition: 'event.foo: *'
`,
    },
  ])('$name: no pairs; omitted workflowEvents defaults to avoid-loop', ({ yaml }) => {
    const doc = parseDocument(yaml);
    const [first] = getTriggerNodes(doc);
    expect(first).toBeDefined();
    expect(getTriggerOnChainOptionPairs(first.node)).toHaveLength(0);
    const triggerJson = first.node.toJSON() as Record<string, unknown>;
    expect(resolveWorkflowEventsModeFromOn(onBlockFromTriggerJson(triggerJson))).toBe('avoid-loop');
  });
});
