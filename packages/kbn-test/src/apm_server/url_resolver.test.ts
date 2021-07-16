/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUrlResolver } from './url_resolver';

const resolver = createUrlResolver(new URL('https://google.com'));

it('resolves urls that start with /', () => {
  expect(resolver`/hello`).toMatchInlineSnapshot(`"https://google.com/hello"`);
});

it('resolves urls that start without /', () => {
  expect(resolver`hello`).toMatchInlineSnapshot(`"https://google.com/hello"`);
});

it('encodes variables in path with encodeURIComponent', () => {
  expect(resolver`hello/${'my/🚀/username'}/`).toMatchInlineSnapshot(
    `"https://google.com/hello/my%2F%F0%9F%9A%80%2Fusername/"`
  );
});

it('preserves trailing slash', () => {
  expect(resolver`hel/lo/`).toMatchInlineSnapshot(`"https://google.com/hel/lo/"`);
});

it('does not add a trailing slash to path', () => {
  expect(resolver`hel/lo`).toMatchInlineSnapshot(`"https://google.com/hel/lo"`);
});
