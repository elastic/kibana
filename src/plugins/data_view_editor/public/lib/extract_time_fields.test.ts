/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractTimeFields } from './extract_time_fields';
import type { IndexPatternField } from 'src/plugins/data/public';

describe('extractTimeFields', () => {
  it('should handle no date fields', () => {
    const fields = [
      { type: 'text', name: 'name' },
      { type: 'text', name: 'name' },
    ] as IndexPatternField[];

    expect(extractTimeFields(fields)).toEqual([]);
  });

  it('should add extra options', () => {
    const fields = [{ type: 'date', name: '@timestamp' }] as IndexPatternField[];

    // const extractedFields = extractTimeFields(fields);
    expect(extractTimeFields(fields)).toEqual([
      { display: '@timestamp', fieldName: '@timestamp' },
      { display: `--- I don't want to use the time filter ---`, fieldName: '' },
    ]);
  });
});
