/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDocLinksMeta } from './get_doc_meta';

describe('getDocLinksMeta', () => {
  it('returns the correct version for the `main` branch', () => {
    expect(getDocLinksMeta({ kibanaBranch: 'main' }).version).toEqual('master');
  });

  it('returns the correct version for other branches', () => {
    expect(getDocLinksMeta({ kibanaBranch: '7.x' }).version).toEqual('7.x');
  });

  it('returns the correct website url', () => {
    expect(getDocLinksMeta({ kibanaBranch: '7.x' }).elasticWebsiteUrl).toEqual(
      'https://www.elastic.co/'
    );
  });
});
