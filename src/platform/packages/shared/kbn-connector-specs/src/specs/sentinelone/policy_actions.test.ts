/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestCase } from './test_helpers';
import { expectDocumentedRequest, resetMocksAroundEachTest } from './test_helpers';

resetMocksAroundEachTest();

/** One row per single-request action: input, then the exact request it must send. */
const REQUEST_CASES: RequestCase[] = [
  [
    'searchBlocklist',
    { value: 'c'.repeat(40), siteIds: ['21'] },
    {
      method: 'GET',
      path: '/restrictions',
      params: { value: 'c'.repeat(40), siteIds: '21', type: 'black_hash' },
    },
  ],
  [
    'addHashToBlocklist',
    { osType: 'windows', sha1: 'c'.repeat(40), description: 'Malware', siteIds: ['21'] },
    {
      method: 'POST',
      path: '/restrictions',
      data: {
        data: {
          osType: 'windows',
          description: 'Malware',
          type: 'black_hash',
          value: 'c'.repeat(40),
        },
        filter: { siteIds: ['21'] },
      },
    },
  ],
  [
    'removeHashFromBlocklist',
    { ids: ['81'] },
    {
      method: 'DELETE',
      path: '/restrictions',
      data: { data: { type: 'black_hash', ids: ['81'] } },
    },
  ],
  [
    'listExclusions',
    { type: 'path', osTypes: ['linux'] },
    { method: 'GET', path: '/exclusions', params: { type: 'path', osTypes: 'linux' } },
  ],
  [
    'createExclusion',
    { type: 'path', osType: 'linux', value: '/opt/app', mode: 'suppress', tenant: true },
    {
      method: 'POST',
      path: '/exclusions',
      data: {
        data: { type: 'path', osType: 'linux', value: '/opt/app', mode: 'suppress' },
        filter: { tenant: true },
      },
    },
  ],
  [
    'deleteExclusion',
    { ids: ['82'], type: 'path' },
    { method: 'DELETE', path: '/exclusions', data: { data: { ids: ['82'], type: 'path' } } },
  ],
  [
    'searchIOCs',
    { type: 'IPV4', accountIds: ['1'] },
    { method: 'GET', path: '/threat-intelligence/iocs', params: { type: 'IPV4', accountIds: '1' } },
  ],
  [
    'createIOC',
    { type: 'IPV4', value: '203.0.113.7', source: 'Elastic', accountIds: ['1'] },
    {
      method: 'POST',
      path: '/threat-intelligence/iocs',
      data: {
        data: [{ type: 'IPV4', value: '203.0.113.7', source: 'Elastic', method: 'EQUALS' }],
        filter: { accountIds: ['1'] },
      },
    },
  ],
  [
    'deleteIOC',
    { accountIds: ['1'], uuids: ['u-1'] },
    {
      method: 'DELETE',
      path: '/threat-intelligence/iocs',
      data: { filter: { accountIds: ['1'], uuids: ['u-1'] } },
    },
  ],
  [
    'listFirewallRules',
    { statuses: ['Enabled'] },
    { method: 'GET', path: '/firewall-control', params: { statuses: 'Enabled' } },
  ],
  [
    'createFirewallRule',
    {
      name: 'Block C2',
      action: 'Block',
      status: 'Enabled',
      osTypes: ['windows'],
      remoteHosts: [{ type: 'addresses', values: ['203.0.113.7'] }],
      groupIds: ['71'],
    },
    {
      method: 'POST',
      path: '/firewall-control',
      data: {
        data: {
          name: 'Block C2',
          action: 'Block',
          status: 'Enabled',
          osTypes: ['windows'],
          remoteHosts: [{ type: 'addresses', values: ['203.0.113.7'] }],
        },
        filter: { groupIds: ['71'] },
      },
    },
  ],
  [
    'deleteFirewallRule',
    { ids: ['91'] },
    { method: 'DELETE', path: '/firewall-control', data: { filter: { ids: ['91'] } } },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);
});
