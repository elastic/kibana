/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getActionTypeDisplayNameFromStepType,
  getActionTypeIdFromStepType,
} from './action_type_utils';

describe('getActionTypeIdFromStepType', () => {
  it.each([
    ['.slack.postMessage', '.slack'],
    ['.email.send', '.email'],
    ['.jira.createIssue', '.jira'],
  ])('extracts action type id from step type with leading dot: "%s" -> "%s"', (input, expected) => {
    expect(getActionTypeIdFromStepType(input)).toBe(expected);
  });

  it.each([
    ['slack.postMessage', '.slack'],
    ['email.send', '.email'],
    ['jira.createIssue', '.jira'],
  ])(
    'extracts action type id from step type without leading dot: "%s" -> "%s"',
    (input, expected) => {
      expect(getActionTypeIdFromStepType(input)).toBe(expected);
    }
  );

  it('handles step type with no sub-action (single segment)', () => {
    expect(getActionTypeIdFromStepType('.slack')).toBe('.slack');
    expect(getActionTypeIdFromStepType('slack')).toBe('.slack');
  });

  it('handles step type with multiple dots', () => {
    expect(getActionTypeIdFromStepType('.foo.bar.baz')).toBe('.foo');
  });
});

describe('getActionTypeDisplayNameFromStepType', () => {
  it.each([
    ['.slack.postMessage', 'Slack'],
    ['.email.send', 'Email'],
    ['.jira.createIssue', 'Jira'],
    ['slack.postMessage', 'Slack'],
  ])('capitalizes action type from step type: "%s" -> "%s"', (input, expected) => {
    expect(getActionTypeDisplayNameFromStepType(input)).toBe(expected);
  });

  it('capitalizes single character action type', () => {
    expect(getActionTypeDisplayNameFromStepType('.x.send')).toBe('X');
  });

  it('handles step type without sub-action', () => {
    expect(getActionTypeDisplayNameFromStepType('.teams')).toBe('Teams');
  });
});
