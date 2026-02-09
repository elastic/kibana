/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasBracketDottedKeyUsage } from './alert_trigger_bracket_key_usage';

describe('hasBracketDottedKeyUsage', () => {
  it('returns true for single-quoted bracket dotted key', () => {
    expect(
      hasBracketDottedKeyUsage("message: {{ event.alerts[0]['kibana.alert.rule.name'] }}")
    ).toBe(true);
  });

  it('returns true for double-quoted bracket dotted key', () => {
    expect(hasBracketDottedKeyUsage('message: {{ event.alerts[0]["kibana.alert.status"] }}')).toBe(
      true
    );
  });

  it('returns false when no dotted key in brackets', () => {
    expect(hasBracketDottedKeyUsage("message: {{ event.alerts[0]['name'] }}")).toBe(false);
  });

  it('returns false when using dot notation only', () => {
    expect(hasBracketDottedKeyUsage('message: {{ event.alerts[0].kibana.alert.rule.name }}')).toBe(
      false
    );
  });

  it('returns false for empty or irrelevant content', () => {
    expect(hasBracketDottedKeyUsage('')).toBe(false);
    expect(hasBracketDottedKeyUsage('triggers:\n  - type: alert')).toBe(false);
  });
});
