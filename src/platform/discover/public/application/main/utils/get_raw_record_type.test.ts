/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RecordRawType } from '../services/discover_data_state_container';
import { getRawRecordType } from './get_raw_record_type';

describe('getRawRecordType', () => {
  it('returns empty string for Query type query', () => {
    const mode = getRawRecordType({ query: '', language: 'lucene' });
    expect(mode).toEqual(RecordRawType.DOCUMENT);
  });

  it('returns esql for Query type query', () => {
    const mode = getRawRecordType({ esql: 'from foo' });

    expect(mode).toEqual(RecordRawType.PLAIN);
  });
});
