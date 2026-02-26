/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getTriggerHoverContent, getTriggerTypeAtPath } from './get_trigger_hover_content';

describe('getTriggerHoverContent', () => {
  it('returns null for built-in trigger: manual', () => {
    const result = getTriggerHoverContent('manual');
    expect(result).toBeNull();
  });

  it('returns null for built-in trigger: alert', () => {
    const result = getTriggerHoverContent('alert');
    expect(result).toBeNull();
  });

  it('returns null for built-in trigger: scheduled', () => {
    const result = getTriggerHoverContent('scheduled');
    expect(result).toBeNull();
  });

  it('returns content for custom trigger with definition and event schema', () => {
    const eventSchema = z.object({
      caseId: z.string().describe('The case identifier'),
      action: z.enum(['created', 'updated']).describe('The action that triggered'),
    });
    const getTriggerDefinition = (id: string) =>
      id === 'cases.updated'
        ? {
            id: 'cases.updated',
            title: 'Case updated',
            description: 'Fired when a case is created or updated.',
            eventSchema,
          }
        : undefined;

    const result = getTriggerHoverContent('cases.updated', getTriggerDefinition('cases.updated'));
    expect(result).not.toBeNull();
    expect(result!.value).toContain('Case updated');
    expect(result!.value).toContain('**Trigger**:');
    expect(result!.value).toContain('Fired when a case is created or updated');
    expect(result!.value).toContain('Event properties');
    expect(result!.value).toContain('Access the event properties with event.*');
    expect(result!.value).toContain('caseId');
    expect(result!.value).toContain('The case identifier');
    expect(result!.value).toContain('action');
    expect(result!.value).toContain('The action that triggered');
  });

  it('returns content for custom trigger with documentation', () => {
    const eventSchema = z.object({ severity: z.string() });
    const getTriggerDefinition = (id: string) =>
      id === 'alerts.severity_high'
        ? {
            id: 'alerts.severity_high',
            title: 'High severity alert',
            description: 'Fired when an alert has high severity.',
            eventSchema,
            documentation: {
              details: 'Filter when this workflow runs using KQL on event properties.',
              examples: [
                '## Exact severity\n```yaml\ntriggers:\n  - type: alerts.severity_high\n    with:\n      condition: \'event.severity == "high"\'\n```',
                '## Multiple severities\n```yaml\ntriggers:\n  - type: alerts.severity_high\n    with:\n      condition: \'event.severity in ["high", "critical"]\'\n```',
              ],
            },
          }
        : undefined;

    const result = getTriggerHoverContent(
      'alerts.severity_high',
      getTriggerDefinition('alerts.severity_high')
    );
    expect(result).not.toBeNull();
    expect(result!.value).toContain('**Summary**:');
    expect(result!.value).toContain('Fired when an alert has high severity.');
    expect(result!.value).toContain('**Description**:');
    expect(result!.value).toContain('Filter when this workflow runs using KQL');
    expect(result!.value).toContain('**Examples:**');
    expect(result!.value).toContain('Exact severity');
    expect(result!.value).toContain('Multiple severities');
    expect(result!.value).toContain('triggers:');
    expect(result!.value).toContain('type: alerts.severity_high');
    expect(result!.value).toContain('condition: \'event.severity == "high"\'');
    expect(result!.value).toContain('condition: \'event.severity in ["high", "critical"]\'');
  });

  it('returns null for unknown custom trigger without definition', () => {
    const result = getTriggerHoverContent('example.custom_trigger');
    expect(result).toBeNull();
  });
});

describe('getTriggerTypeAtPath', () => {
  it('returns trigger type when path is triggers.N.type and value is string', () => {
    const getValueAtPath = (path: (string | number)[]) => {
      if (path[0] === 'triggers' && path[2] === 'type') return 'manual';
      return undefined;
    };
    expect(getTriggerTypeAtPath(['triggers', 0, 'type'], getValueAtPath)).toBe('manual');
  });

  it('returns trigger type when path is triggers.N (anywhere under trigger)', () => {
    const getValueAtPath = (path: (string | number)[]) => {
      if (path[0] === 'triggers' && path[1] === 0 && path[2] === 'type') return 'scheduled';
      return undefined;
    };
    expect(getTriggerTypeAtPath(['triggers', 0], getValueAtPath)).toBe('scheduled');
    expect(getTriggerTypeAtPath(['triggers', 0, 'with'], getValueAtPath)).toBe('scheduled');
  });

  it('returns null when path is not under triggers', () => {
    const getValueAtPath = () => 'manual';
    expect(getTriggerTypeAtPath(['steps', 0, 'type'], getValueAtPath)).toBeNull();
  });

  it('returns null when path length < 2 (no trigger index)', () => {
    const getValueAtPath = () => 'manual';
    expect(getTriggerTypeAtPath([], getValueAtPath)).toBeNull();
    expect(getTriggerTypeAtPath(['triggers'], getValueAtPath)).toBeNull();
  });

  it('returns null when value at path is not a string', () => {
    const getValueAtPath = () => 123;
    expect(getTriggerTypeAtPath(['triggers', 0, 'type'], getValueAtPath)).toBeNull();
  });
});
