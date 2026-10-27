/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSandboxHosts } from './get_sandbox_hosts';

describe('getSandboxHosts', () => {
  it('returns empty when the spec declares no sandbox hosts', () => {
    expect(getSandboxHosts(undefined, { url: 'https://example.com' })).toEqual([]);
  });

  it('returns the fixed hosts', () => {
    expect(getSandboxHosts({ hosts: ['api.example.com', 'Uploads.Example.com'] }, {})).toEqual([
      'api.example.com',
      'uploads.example.com',
    ]);
  });

  it('adds the host of each configured URL without scheme, port, or path', () => {
    expect(
      getSandboxHosts(
        { hosts: ['api.example.com'], hostsFromConfig: ['url', 'otherUrl'] },
        { url: 'https://My-Cluster.example.com:9243/path?q=1', otherUrl: ' http://10.0.0.5:9200 ' }
      )
    ).toEqual(['api.example.com', 'my-cluster.example.com', '10.0.0.5']);
  });

  it('removes duplicate hosts', () => {
    expect(
      getSandboxHosts(
        { hosts: ['api.example.com'], hostsFromConfig: ['url'] },
        { url: 'https://api.example.com/v1' }
      )
    ).toEqual(['api.example.com']);
  });

  it('skips config fields that are missing, empty, not strings, or not URLs', () => {
    expect(
      getSandboxHosts(
        { hostsFromConfig: ['missing', 'empty', 'number', 'invalid'] },
        { empty: ' ', number: 42, invalid: 'not a url' }
      )
    ).toEqual([]);
  });
});
