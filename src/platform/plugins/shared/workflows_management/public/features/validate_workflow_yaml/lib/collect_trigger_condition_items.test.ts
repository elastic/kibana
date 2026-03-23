/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, parseDocument } from 'yaml';
import {
  collectTriggerConditionItems,
  type TriggerConditionItem,
} from './collect_trigger_condition_items';

function parse(yaml: string) {
  return parseDocument(yaml);
}

describe('collectTriggerConditionItems', () => {
  it('returns an empty array when the document has no contents', () => {
    const doc = parse('');
    expect(collectTriggerConditionItems(doc)).toEqual([]);
  });

  it('returns an empty array when the document has null contents', () => {
    const doc = new Document(null);
    expect(collectTriggerConditionItems(doc)).toEqual([]);
  });

  it('returns an empty array when the document has parse errors', () => {
    // Use a YAML string guaranteed to produce parse errors (duplicate key + bad indentation)
    const doc = parse(':\n\t- :\n\t\t');
    // If parseDocument happens to not produce errors for this string,
    // manually inject one to test the branch
    if (doc.errors.length === 0) {
      doc.errors.push({ code: 'TAB_AS_INDENT', message: 'test error' } as never);
    }
    expect(collectTriggerConditionItems(doc)).toEqual([]);
  });

  it('returns an empty array when there are no triggers', () => {
    const yaml = `name: my-workflow
steps:
  - name: step1
    type: action`;
    const doc = parse(yaml);
    expect(collectTriggerConditionItems(doc)).toEqual([]);
  });

  it('returns an empty array when triggers have no condition', () => {
    const yaml = `triggers:
  - type: alert
    on:
      source: some-source`;
    const doc = parse(yaml);
    expect(collectTriggerConditionItems(doc)).toEqual([]);
  });

  it('collects a single trigger condition', () => {
    const yaml = `triggers:
  - type: alert
    on:
      condition: "host.name: server1"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      triggerIndex: 0,
      triggerType: 'alert',
      condition: 'host.name: server1',
      yamlPath: ['triggers', 0, 'on', 'condition'],
    });
  });

  it('collects multiple trigger conditions', () => {
    const yaml = `triggers:
  - type: alert
    on:
      condition: "host.name: server1"
  - type: webhook
    on:
      condition: "status: active"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(2);
    expect(items[0].triggerIndex).toBe(0);
    expect(items[0].triggerType).toBe('alert');
    expect(items[0].condition).toBe('host.name: server1');
    expect(items[1].triggerIndex).toBe(1);
    expect(items[1].triggerType).toBe('webhook');
    expect(items[1].condition).toBe('status: active');
  });

  it('skips triggers without a type field', () => {
    const yaml = `triggers:
  - on:
      condition: "should-be-skipped"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);
    expect(items).toHaveLength(0);
  });

  it('skips conditions not at the triggers[n].on.condition path', () => {
    const yaml = `steps:
  - name: step1
    on:
      condition: "not a trigger condition"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);
    expect(items).toEqual([]);
  });

  it('provides correct line and column positions', () => {
    const yaml = `triggers:
  - type: alert
    on:
      condition: "host.name: server1"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(1);
    // The condition value starts at line 4 (the "host.name: server1" value)
    expect(items[0].startLineNumber).toBeGreaterThanOrEqual(4);
    expect(items[0].startColumn).toBeGreaterThanOrEqual(1);
    expect(items[0].endLineNumber).toBeGreaterThanOrEqual(items[0].startLineNumber);
    expect(items[0].endColumn).toBeGreaterThanOrEqual(1);
  });

  it('handles a trigger with condition among multiple triggers where only some have conditions', () => {
    const yaml = `triggers:
  - type: scheduled
    with:
      every: 1m
  - type: alert
    on:
      condition: "severity: critical"
  - type: manual`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0].triggerIndex).toBe(1);
    expect(items[0].triggerType).toBe('alert');
    expect(items[0].condition).toBe('severity: critical');
  });

  it('returns correct yamlPath for each item', () => {
    const yaml = `triggers:
  - type: first
    on:
      condition: "a: 1"
  - type: second
    on:
      condition: "b: 2"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items[0].yamlPath).toEqual(['triggers', 0, 'on', 'condition']);
    expect(items[1].yamlPath).toEqual(['triggers', 1, 'on', 'condition']);
  });

  it('handles condition with empty string value', () => {
    const yaml = `triggers:
  - type: alert
    on:
      condition: ""`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(1);
    expect(items[0].condition).toBe('');
  });

  it('returns items with consistent position types', () => {
    const yaml = `triggers:
  - type: mytype
    on:
      condition: "test"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    expect(items).toHaveLength(1);
    const item: TriggerConditionItem = items[0];
    expect(typeof item.startLineNumber).toBe('number');
    expect(typeof item.startColumn).toBe('number');
    expect(typeof item.endLineNumber).toBe('number');
    expect(typeof item.endColumn).toBe('number');
    expect(typeof item.triggerIndex).toBe('number');
    expect(typeof item.triggerType).toBe('string');
    expect(typeof item.condition).toBe('string');
    expect(Array.isArray(item.yamlPath)).toBe(true);
  });

  it('ignores nested condition keys that are not under triggers[n].on', () => {
    const yaml = `triggers:
  - type: alert
    metadata:
      condition: "should-be-ignored"
    on:
      condition: "should-be-collected"`;
    const doc = parse(yaml);
    const items = collectTriggerConditionItems(doc);

    // Only triggers[0].on.condition should be collected, not triggers[0].metadata.condition
    expect(items).toHaveLength(1);
    expect(items[0].condition).toBe('should-be-collected');
  });
});
