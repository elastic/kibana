/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeVersion } from './encode_version';

describe('encodeVersion', () => {
  it('throws if primaryTerm is not an integer', () => {
    expect(() => encodeVersion(1, undefined as any)).toThrowErrorMatchingInlineSnapshot(
      `"_primary_term from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(1, null as any)).toThrowErrorMatchingInlineSnapshot(
      `"_primary_term from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(1, {} as any)).toThrowErrorMatchingInlineSnapshot(
      `"_primary_term from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(1, [] as any)).toThrowErrorMatchingInlineSnapshot(
      `"_primary_term from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(1, 2.5 as any)).toThrowErrorMatchingInlineSnapshot(
      `"_primary_term from elasticsearch must be an integer"`
    );
  });

  it('throws if seqNo is not an integer', () => {
    expect(() => encodeVersion(undefined as any, 1)).toThrowErrorMatchingInlineSnapshot(
      `"_seq_no from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(null as any, 1)).toThrowErrorMatchingInlineSnapshot(
      `"_seq_no from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion({} as any, 1)).toThrowErrorMatchingInlineSnapshot(
      `"_seq_no from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion([] as any, 1)).toThrowErrorMatchingInlineSnapshot(
      `"_seq_no from elasticsearch must be an integer"`
    );
    expect(() => encodeVersion(2.5 as any, 1)).toThrowErrorMatchingInlineSnapshot(
      `"_seq_no from elasticsearch must be an integer"`
    );
  });

  it('returns a base64 encoded, JSON string of seqNo and primaryTerm', () => {
    expect(encodeVersion(123, 456)).toMatchInlineSnapshot(`"WzEyMyw0NTZd"`);
  });
});
