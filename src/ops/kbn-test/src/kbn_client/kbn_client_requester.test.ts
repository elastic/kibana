/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pathWithSpace } from './kbn_client_requester';

describe('pathWithSpace()', () => {
  it('adds a space to the path', () => {
    expect(pathWithSpace('hello')`/foo/bar`).toMatchInlineSnapshot(`"/s/hello/foo/bar"`);
  });

  it('ignores the space when it is empty', () => {
    expect(pathWithSpace(undefined)`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
    expect(pathWithSpace('')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('ignores the space when it is the default space', () => {
    expect(pathWithSpace('default')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('uriencodes variables in the path', () => {
    expect(pathWithSpace('space')`hello/${'funky/username🏴‍☠️'}`).toMatchInlineSnapshot(
      `"/s/space/hello/funky%2Fusername%F0%9F%8F%B4%E2%80%8D%E2%98%A0%EF%B8%8F"`
    );
  });

  it('ensures the path always starts with a slash', () => {
    expect(pathWithSpace('foo')`hello/world`).toMatchInlineSnapshot(`"/s/foo/hello/world"`);
    expect(pathWithSpace()`hello/world`).toMatchInlineSnapshot(`"/hello/world"`);
  });
});
