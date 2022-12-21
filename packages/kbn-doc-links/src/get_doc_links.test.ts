/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinks } from './get_doc_links';

describe('getDocLinks', () => {
  it('returns an immutable object', () => {
    const links = getDocLinks({ kibanaBranch: 'test.branch' });

    expect(() => {
      (links as unknown as Record<string, unknown>).settings = 'override';
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot assign to read only property 'settings' of object '#<Object>'"`
    );
  });
});
