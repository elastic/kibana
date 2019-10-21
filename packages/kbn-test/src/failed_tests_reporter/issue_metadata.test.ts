/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
