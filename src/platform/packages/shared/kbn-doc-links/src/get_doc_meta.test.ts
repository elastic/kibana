/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocLinksMeta } from './get_doc_meta';

describe('getDocLinksMeta', () => {
  it('returns the correct version for the `main` branch', () => {
    expect(getDocLinksMeta({ kibanaBranch: 'main', buildFlavor: 'traditional' }).version).toEqual(
      'current'
    );
  });

  it('returns the correct version for other branches', () => {
    expect(getDocLinksMeta({ kibanaBranch: '7.x', buildFlavor: 'traditional' }).version).toEqual(
      '7.x'
    );
  });

  it('returns the correct website url', () => {
    expect(
      getDocLinksMeta({ kibanaBranch: '7.x', buildFlavor: 'traditional' }).elasticWebsiteUrl
    ).toEqual('https://www.elastic.co/');
  });
});
