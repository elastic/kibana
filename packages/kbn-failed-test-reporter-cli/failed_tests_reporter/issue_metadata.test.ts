/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';

const HAS_METADATA = dedent`
  # my issue

  some text

  <!-- kibanaCiData = {"failed-test": {"foo": "bar"}} -->
`;

const HAS_SOME_OTHER_METADATA = dedent`
  # my issue

  some text

  <!-- kibanaCiData = {"some-other": {"foo": "bar"}} -->
`;

const INVALID_METADATA = dedent`
  # my issue

  some text

  <!-- kibanaCiData = {"failed-test" -->
`;

const MISSING_METADATA = dedent`
  # my issue

  some text
`;

describe('getIssueMetadata', () => {
  it('reads properly formatted metadata', () => {
    expect(getIssueMetadata(HAS_METADATA, 'foo')).toBe('bar');
  });

  it('returns undefined if JSON is malformed', () => {
    expect(getIssueMetadata(INVALID_METADATA, 'foo')).toBe(undefined);
  });

  it('returns undefined if metadata is missing', () => {
    expect(getIssueMetadata(MISSING_METADATA, 'foo')).toBe(undefined);
  });

  it('returns undefined if JSON is missing `failed-test` property', () => {
    expect(getIssueMetadata(HAS_SOME_OTHER_METADATA, 'foo')).toBe(undefined);
  });

  it('returns defaultValue if specified', () => {
    expect(getIssueMetadata(HAS_METADATA, 'foo2', 'bar2')).toBe('bar2');
  });

  it('returns undefined if defaultValue is not specified', () => {
    expect(getIssueMetadata(HAS_METADATA, 'foo2')).toBe(undefined);
  });
});

describe('updateIssueMetadata', () => {
  it('merges new values with previous values', () => {
    expect(
      updateIssueMetadata(HAS_METADATA, {
        box: 'baz',
      })
    ).toMatchInlineSnapshot(`
      "# my issue

      some text

      <!-- kibanaCiData = {\\"failed-test\\":{\\"foo\\":\\"bar\\",\\"box\\":\\"baz\\"}} -->"
    `);
  });

  it('adds metadata if not found', () => {
    expect(
      updateIssueMetadata(MISSING_METADATA, {
        box: 'baz',
      })
    ).toMatchInlineSnapshot(`
      "# my issue

      some text

      <!-- kibanaCiData = {\\"failed-test\\":{\\"box\\":\\"baz\\"}} -->"
    `);

    expect(
      updateIssueMetadata(HAS_SOME_OTHER_METADATA, {
        box: 'baz',
      })
    ).toMatchInlineSnapshot(`
      "# my issue

      some text

      <!-- kibanaCiData = {\\"some-other\\":{\\"foo\\":\\"bar\\"},\\"failed-test\\":{\\"box\\":\\"baz\\"}} -->"
    `);
  });

  it('overwrites metdata if JSON is malformed', () => {
    expect(
      updateIssueMetadata(INVALID_METADATA, {
        box: 'baz',
      })
    ).toMatchInlineSnapshot(`
      "# my issue

      some text

      <!-- kibanaCiData = {\\"failed-test\\":{\\"box\\":\\"baz\\"}} -->"
    `);
  });
});
