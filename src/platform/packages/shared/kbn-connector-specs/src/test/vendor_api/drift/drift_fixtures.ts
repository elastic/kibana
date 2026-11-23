/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorDrift } from './detect_drift';

/** A connector whose actions pass against both the committed snapshot and the latest spec. */
export const healthy: ConnectorDrift = {
  connector: '.acme',
  sources: { main: { status: 'unchanged' } },
  operationsChanged: false,
  snapshotProblems: [],
  latestProblems: [],
  verdict: 'healthy',
  overlayFindings: [],
  outcome: 'none',
};

/** A connector whose `search` action fails against the latest spec, with one change to review. */
export const drifted: ConnectorDrift = {
  ...healthy,
  sources: {
    main: {
      status: 'changed',
      url: 'https://specs.example.com/openapi.json',
      changes: [
        {
          kind: 'breaking',
          id: 'request-parameter-max-decreased',
          text: 'decreased the max of `limit` to 50',
          operation: 'GET /items',
        },
        { kind: 'non-breaking', id: 'response-optional-property-added', text: 'added `title`' },
      ],
    },
  },
  latestProblems: ['search: GET /items breaks the spec: limit must be <= 50'],
  verdict: 'vendor-drift',
  outcome: 'issue',
  displayName: 'Acme',
  folder: 'src/specs/acme',
  checkedAt: '2026-11-16T06:00:00.000Z',
  actions: [
    {
      action: 'search',
      operations: [{ source: 'main', operation: 'GET /items', latest: { status: 'present' } }],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: ['GET /items breaks the spec: limit must be <= 50'],
    },
    {
      action: 'getItem',
      operations: [{ source: 'main', operation: 'GET /items/{id}', latest: { status: 'present' } }],
      unmatched: [],
      snapshotProblems: [],
      latestProblems: [],
    },
  ],
  otherProblems: { snapshot: [], latest: [] },
  staleCorrections: [],
};
