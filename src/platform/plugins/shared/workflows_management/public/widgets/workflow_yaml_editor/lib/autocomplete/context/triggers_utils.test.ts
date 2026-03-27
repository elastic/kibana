/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getTriggerConditionBlockIndex, getTriggerTypeAtIndex } from './triggers_utils';

describe('getTriggerConditionBlockIndex', () => {
  it('returns trigger index when path is triggers[i].on.condition', () => {
    expect(getTriggerConditionBlockIndex(['triggers', 2, 'on', 'condition'])).toBe(2);
  });

  it('returns null for wrong path shape', () => {
    expect(getTriggerConditionBlockIndex(['triggers', 0, 'on'])).toBeNull();
    expect(getTriggerConditionBlockIndex(['triggers', '0', 'on', 'condition'])).toBeNull();
    expect(getTriggerConditionBlockIndex(['steps', 0, 'on', 'condition'])).toBeNull();
  });
});

describe('getTriggerTypeAtIndex', () => {
  it('reads triggers[i].type as a YAML scalar (keepScalar) for dotted custom ids', () => {
    const doc = parseDocument(`triggers:
  - type: example.custom_trigger
    on:
      condition: "x"
`);
    expect(getTriggerTypeAtIndex(doc, 0)).toBe('example.custom_trigger');
  });

  it('returns null when type is missing', () => {
    const doc = parseDocument(`triggers:
  - on:
      condition: "x"
`);
    expect(getTriggerTypeAtIndex(doc, 0)).toBeNull();
  });
});
