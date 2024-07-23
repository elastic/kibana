/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pathWithSpace, redactUrl } from './kbn_client_requester';

describe('KBN Client Requester Functions', () => {
  it('pathWithSpace() adds a space to the path', () => {
    expect(pathWithSpace('hello')`/foo/bar`).toMatchInlineSnapshot(`"/s/hello/foo/bar"`);
  });

  it('pathWithSpace() ignores the space when it is empty', () => {
    expect(pathWithSpace(undefined)`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
    expect(pathWithSpace('')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('pathWithSpace() ignores the space when it is the default space', () => {
    expect(pathWithSpace('default')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('pathWithSpace() uriencodes variables in the path', () => {
    expect(pathWithSpace('space')`hello/${'funky/username🏴‍☠️'}`).toMatchInlineSnapshot(
      `"/s/space/hello/funky%2Fusername%F0%9F%8F%B4%E2%80%8D%E2%98%A0%EF%B8%8F"`
    );
  });

  it('pathWithSpace() ensures the path always starts with a slash', () => {
    expect(pathWithSpace('foo')`hello/world`).toMatchInlineSnapshot(`"/s/foo/hello/world"`);
    expect(pathWithSpace()`hello/world`).toMatchInlineSnapshot(`"/hello/world"`);
  });

  it(`redactUrl() takes a string such as 'http://some-user:some-password@localhost:5620' and returns the url without the auth info`, () => {
    expect(
      redactUrl(
        'http://testing-internal:someawesomepassword@localhost:5620/internal/ftr/kbn_client_so/task/serverless-security%3Anlp-cleanup-task%3A1.0.0'
      )
    ).toEqual(
      'http://localhost:5620/internal/ftr/kbn_client_so/task/serverless-security%3Anlp-cleanup-task%3A1.0.0'
    );
  });
});
