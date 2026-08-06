/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepIconType, getTriggerTypeIconType } from './get_step_icon_type';
import { HardcodedIcons } from './hardcoded_icons';

describe('getTriggerTypeIconType', () => {
  it.each([
    ['trigger_manual', 'play'],
    ['trigger_alert', 'warning'],
    ['trigger_document', 'document'],
    ['trigger_event', 'document'],
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
    ['globe', 'http'],
    ['commandLine', 'console'],
    ['database', 'data.set'],
    ['clock', 'wait'],
    ['user', 'waitForInput'],
    ['user', 'waitForApproval'],
    ['branch', 'if'],
    ['tokenBoolean', 'if-branch'],
    ['refresh', 'foreach'],
    ['refresh', 'while'],
    ['refresh', 'enter-while'],
    ['tokenNumber', 'foreach-iteration'],
    ['tokenNumber', 'while-iteration'],
    ['controls', 'loop.break'],
    ['controls', 'loop.continue'],
    ['controls', 'loop-break'],
    ['controls', 'loop-continue'],
    ['productStreamsWired', 'switch'],
    ['productStreamsWired', 'enter-switch'],
    ['productStreamsWired', 'exit-switch'],
    ['productStreamsWired', 'enter-case-branch'],
    ['productStreamsWired', 'exit-case-branch'],
    ['productStreamsWired', 'enter-default-branch'],
    ['productStreamsWired', 'exit-default-branch'],
    ['mail', 'email'],
    ['logoSlack', 'slack'],
    ['logoSlack', 'slack_api'],
    ['sparkles', 'inference'],
  ])('should return "%s" icon for the "%s" step type', (expectedIcon, nodeType) => {
    expect(getStepIconType(nodeType)).toBe(expectedIcon);
  });

  it.each(['parallel', 'enter-parallel', 'exit-parallel', 'parallel-branch'])(
    'should return the hardcoded parallel icon for the "%s" step type',
    (nodeType) => {
      expect(getStepIconType(nodeType)).toBe(HardcodedIcons.parallel);
    }
  );

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

  // Regression guard: getStepIconType accepts raw dotted connector types (e.g. ".slack")
  // without a separate normalization step. Each case below returned "plugs" before the
  // leading-dot strip was added; if the strip is removed they must fail.
  it.each([
    ['logoSlack', '.slack'],
    ['logoSlack', '.slack_api'],
    ['mail', '.email'],
    ['sparkles', '.inference'],
  ])('should strip the leading dot and return "%s" for "%s"', (expected, nodeType) => {
    expect(getStepIconType(nodeType)).toBe(expected);
  });
});
