/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepIconType, getTriggerTypeIconType } from './get_step_icon_type';

describe('getTriggerTypeIconType', () => {
  it.each([
    ['trigger_manual', 'play'],
    ['trigger_alert', 'warning'],
    ['trigger_document', 'document'],
    ['trigger_scheduled', 'clock'],
  ] as const)('should return "%s" icon for %s', (triggerType, expectedIcon) => {
    expect(getTriggerTypeIconType(triggerType)).toBe(expectedIcon);
  });

  it('should return "info" for unknown trigger types', () => {
    expect(getTriggerTypeIconType('trigger_unknown')).toBe('info');
    expect(getTriggerTypeIconType('')).toBe('info');
  });
});

describe('getStepIconType', () => {
  it.each([
    ['http', 'globe'],
    ['console', 'console'],
    ['data.set', 'tableOfContents'],
    ['wait', 'clock'],
    ['if', 'branch'],
    ['if-branch', 'tokenBoolean'],
    ['foreach', 'refresh'],
    ['foreach-iteration', 'tokenNumber'],
    ['email', 'email'],
    ['slack', 'logoSlack'],
    ['slack_api', 'logoSlack'],
    ['inference', 'sparkles'],
  ] as const)('should return "%s" icon for %s', (nodeType, expectedIcon) => {
    expect(getStepIconType(nodeType)).toBe(expectedIcon);
  });

  it('should return "logoElasticsearch" for elasticsearch-prefixed types', () => {
    expect(getStepIconType('elasticsearch.search')).toBe('logoElasticsearch');
    expect(getStepIconType('elasticsearch.index')).toBe('logoElasticsearch');
  });

  it('should return "logoKibana" for kibana-prefixed types', () => {
    expect(getStepIconType('kibana.alerting')).toBe('logoKibana');
  });

  it('should return "plugs" for unknown step types', () => {
    expect(getStepIconType('custom_step')).toBe('plugs');
    expect(getStepIconType('unknown')).toBe('plugs');
  });
});
