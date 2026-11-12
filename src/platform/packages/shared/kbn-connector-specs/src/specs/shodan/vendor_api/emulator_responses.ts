/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-emulate';

const GOOGLE_DNS = {
  ip_str: '8.8.8.8',
  ip: 134744072,
  port: 443,
  transport: 'tcp',
  org: 'Google LLC',
  isp: 'Google LLC',
  asn: 'AS15169',
  hostnames: ['dns.google'],
  domains: ['dns.google'],
  os: null,
  location: {
    city: 'Mountain View',
    country_code: 'US',
    country_name: 'United States',
    latitude: 37.4056,
    longitude: -122.0775,
  },
};

/**
 * What the emulator answers the Shodan operations with, in place of values sampled from the spec: a
 * search for hosts running Apache, the facets of a count, and what Shodan knows of a host. The
 * emulator only takes responses that match Shodan's spec.
 */
export const getShodanFixtures = (): readonly ResponseFixture[] => [
  {
    operation: { source: 'rest', method: 'get', path: '/shodan/host/search' },
    response: {
      status: 200,
      body: {
        total: 2,
        matches: [
          {
            ...GOOGLE_DNS,
            ip_str: '203.0.113.10',
            port: 80,
            org: 'Example Hosting GmbH',
            hostnames: ['web1.example.de'],
            product: 'Apache httpd',
            version: '2.4.58',
          },
          {
            ...GOOGLE_DNS,
            ip_str: '203.0.113.24',
            port: 443,
            org: 'Example Hosting GmbH',
            hostnames: ['web2.example.de'],
            product: 'Apache httpd',
            version: '2.4.57',
          },
        ],
        facets: {},
      },
    },
  },
  {
    operation: { source: 'rest', method: 'get', path: '/shodan/host/count' },
    response: {
      status: 200,
      body: {
        total: 4812,
        facets: {
          country: [
            { value: 'US', count: 1903 },
            { value: 'DE', count: 877 },
            { value: 'NL', count: 412 },
          ],
        },
      },
    },
  },
  {
    operation: { source: 'rest', method: 'get', path: '/shodan/host/{ip}' },
    response: {
      status: 200,
      body: {
        ...GOOGLE_DNS,
        city: 'Mountain View',
        country_name: 'United States',
        ports: [53, 443],
        data: [
          { port: 53, transport: 'udp', product: 'Google DNS', data: 'Recursion: enabled' },
          { port: 443, transport: 'tcp', data: 'HTTP/1.1 302 Found' },
        ],
      },
    },
  },
];
