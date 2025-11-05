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
});
