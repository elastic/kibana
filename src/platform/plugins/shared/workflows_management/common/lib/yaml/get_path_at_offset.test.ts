/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getPathAtOffset } from './get_path_at_offset';

describe('getPathAtOffset', () => {
  it('should return the correct path at the offset', () => {
    const yaml = `steps:
      - name: noop_step
        type: noop|<-
        with:
          message: Hello, world!`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps', 0, 'type']);
  });
  it('should return the correct path even with incomplete yaml', () => {
    const yaml = `steps:
      - name: noop_step
        |<-
      - name: if_step
        type: if
        condition: 'true'
        steps:
          - name: then_step
            type: console
            with:
            message: "true {{event.spaceId}}"
`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps', 0]);
  });

  it('should handle deeply nested structures', () => {
    const yaml = `steps:
      - name: outer_step
        type: if
        steps:
          - name: inner_step
            with:
              nested:
                deep:
                  value: test|<-`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['steps', 0, 'steps', 0, 'with', 'nested', 'deep', 'value']);
  });

  it('should handle arrays within objects', () => {
    const yaml = `config:
      items:
        - first|<-
        - second
        - third`;
    const offset = yaml.indexOf('|<-');
    const result = getPathAtOffset(parseDocument(yaml), offset);
    expect(result).toEqual(['config', 'items', 0]);
  });

  it('should return empty array for empty document', () => {
    const result = getPathAtOffset(parseDocument(''), 0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no node found at offset', () => {
    const yaml = `steps:
      - name: test`;
    const result = getPathAtOffset(parseDocument(yaml), 1000);
    expect(result).toEqual([]);
  });

  it('should handle offset at the beginning of a key', () => {
    const yaml = `steps:
      - name|<-: test_step
        type: noop`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps', 0, 'name']);
  });

  it('should handle offset in multiline strings', () => {
    const yaml = `steps:
      - name: test_step
        description: |
          This is a
          multiline|<-
          description`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps', 0, 'description']);
  });

  it('should skip empty scalars from incomplete yaml', () => {
    const yaml = `steps:
      - name:
        |<-
        type: test`;
    const offset = yaml.indexOf('|<-');
    const cleanedYaml = yaml.replace('|<-', '');
    const result = getPathAtOffset(parseDocument(cleanedYaml), offset);
    expect(result).toEqual(['steps', 0]);
  });
});
