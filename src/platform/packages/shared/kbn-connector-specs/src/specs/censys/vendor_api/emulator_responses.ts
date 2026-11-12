/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-emulate';

const HOST = {
  ip: '8.8.8.8',
  location: { city: 'Mountain View', country: 'United States', country_code: 'US' },
  autonomous_system: { asn: 15169, name: 'GOOGLE', country_code: 'US' },
  dns: { reverse_dns: { names: ['dns.google'] } },
  services: [
    { port: 53, protocol: 'DNS' },
    { port: 443, protocol: 'HTTP' },
  ],
};

/**
 * What the emulator answers the Censys host lookups with, in place of values sampled from the spec:
 * the record of a well-known host, with the media types Censys's spec names. The emulator only
 * takes responses that match Censys's spec.
 */
export const getCensysFixtures = (): readonly ResponseFixture[] => [
  {
    operation: { source: 'platform', method: 'get', path: '/v3/global/asset/host/{host_id}' },
    response: {
      status: 200,
      headers: { 'content-type': 'application/vnd.censys.api.v3.host.v1+json' },
      body: { result: { extensions: {}, resource: HOST } },
    },
  },
  {
    operation: {
      source: 'platform',
      method: 'get',
      path: '/v3/global/asset/enrichment/host/{host_ip}',
    },
    response: {
      status: 200,
      headers: { 'content-type': 'application/vnd.censys.api.v3.host-enrichment.v1+json' },
      body: { result: { extensions: {}, resource: HOST } },
    },
  },
];
