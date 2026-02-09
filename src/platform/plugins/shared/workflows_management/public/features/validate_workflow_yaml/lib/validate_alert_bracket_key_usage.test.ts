/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { validateAlertBracketKeyUsage } from './validate_alert_bracket_key_usage';

describe('validateAlertBracketKeyUsage', () => {
  const workflowWithAlertTrigger = {
    triggers: [{ type: 'alert' }],
  } as WorkflowYaml;

  const workflowWithManualTrigger = {
    triggers: [{ type: 'manual' }],
  } as WorkflowYaml;

  it('returns a warning when workflow has alert trigger and uses bracket dotted keys', () => {
    const yaml = `steps:
  - type: log
    with:
      message: "{{ event.alerts[0]['kibana.alert.rule.name'] }}"`;
    const result = validateAlertBracketKeyUsage(yaml, workflowWithAlertTrigger);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('warning');
    expect(result[0].owner).toBe('alert-bracket-key-validation');
    expect(result[0].message).toContain('bracket notation');
  });

  it('returns empty when workflow has alert trigger but no bracket dotted keys', () => {
    const yaml = `steps:
  - type: log
    with:
      message: "{{ event.alerts[0].kibana.alert.rule.name }}"`;
    const result = validateAlertBracketKeyUsage(yaml, workflowWithAlertTrigger);
    expect(result).toHaveLength(0);
  });

  it('returns empty when workflow has no alert trigger', () => {
    const yaml = `steps:
  - type: log
    with:
      message: "{{ event.alerts[0]['kibana.alert.rule.name'] }}"`;
    const result = validateAlertBracketKeyUsage(yaml, workflowWithManualTrigger);
    expect(result).toHaveLength(0);
  });

  it('returns empty when workflowDefinition is null', () => {
    const result = validateAlertBracketKeyUsage('message: {{ x["a.b"] }}', null);
    expect(result).toHaveLength(0);
  });
});
