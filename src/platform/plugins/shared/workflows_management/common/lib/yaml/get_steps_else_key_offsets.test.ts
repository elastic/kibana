/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import {
  getInnermostBlockContainingOffset,
  getStepsAndElseKeyOffsets,
} from './get_steps_else_key_offsets';

describe('getStepsAndElseKeyOffsets', () => {
  it('finds steps and else key offsets', () => {
    const yaml = `steps:
  - name: s1
    type: noop
    if: "{{ condition }}"
    else:
      - name: fallback
        type: noop`;
    const doc = parseDocument(yaml);
    const result = getStepsAndElseKeyOffsets(doc);
    expect(result.stepsKeyStartOffsets.length).toBeGreaterThanOrEqual(1);
    expect(result.elseKeyStartOffsets.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty arrays for document without steps or else', () => {
    const doc = parseDocument('name: test');
    const result = getStepsAndElseKeyOffsets(doc);
    expect(result.stepsKeyStartOffsets).toEqual([]);
    expect(result.elseKeyStartOffsets).toEqual([]);
  });

  it('handles multiple steps keys (nested foreach)', () => {
    const yaml = `steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: inner
        type: noop`;
    const doc = parseDocument(yaml);
    const result = getStepsAndElseKeyOffsets(doc);
    expect(result.stepsKeyStartOffsets.length).toBe(2);
  });
});

describe('getInnermostBlockContainingOffset', () => {
  const yaml = `steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: inner
        type: noop`;

  it('returns the innermost block for a cursor inside nested steps', () => {
    const doc = parseDocument(yaml);
    // Cursor offset within the nested steps block
    const innerStepsOffset = yaml.indexOf('name: inner');
    const result = getInnermostBlockContainingOffset(doc, innerStepsOffset);
    expect(result).not.toBeNull();
    expect(result!.rangeStart).toBeGreaterThan(0);
  });

  it('returns null when cursor is outside any block', () => {
    const doc = parseDocument('name: test');
    const result = getInnermostBlockContainingOffset(doc, 0);
    expect(result).toBeNull();
  });
});
