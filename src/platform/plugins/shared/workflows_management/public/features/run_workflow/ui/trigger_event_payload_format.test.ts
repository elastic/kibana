/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildTriggerEventPayloadCompactText,
  formatTriggerEventPayloadForCopy,
  formatTriggerEventPayloadPreview,
  PAYLOAD_COMPACT_MAX_CHARS,
} from './trigger_event_payload_format';

describe('trigger_event_payload_format', () => {
  const sample = { a: 1, b: { c: 2 } };

  it('formatTriggerEventPayloadForCopy uses compact JSON', () => {
    expect(formatTriggerEventPayloadForCopy(sample)).toBe(JSON.stringify(sample));
    expect(formatTriggerEventPayloadForCopy(sample)).not.toContain('\n');
  });

  it('formatTriggerEventPayloadPreview pretty-prints objects', () => {
    expect(formatTriggerEventPayloadPreview(sample)).toBe(JSON.stringify(sample, null, 2));
  });

  it('buildTriggerEventPayloadCompactText truncates compact JSON at 500 chars', () => {
    const large = { data: 'x'.repeat(600) };
    const { text, isEmpty } = buildTriggerEventPayloadCompactText(large);
    expect(isEmpty).toBe(false);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length).toBe(PAYLOAD_COMPACT_MAX_CHARS + 1);
    expect(text).not.toContain('\n');
  });

  it('marks empty payloads', () => {
    expect(buildTriggerEventPayloadCompactText({})).toEqual({ text: '', isEmpty: true });
    expect(buildTriggerEventPayloadCompactText(undefined)).toEqual({ text: '', isEmpty: true });
  });
});
