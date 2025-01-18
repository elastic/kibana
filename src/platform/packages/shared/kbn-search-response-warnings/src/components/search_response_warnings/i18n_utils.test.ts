/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWarningsTitle, getWarningsDescription } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

describe('getWarningsTitle', () => {
  test('Should show title for single non-successful cluster', () => {
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
    ];
    expect(getWarningsTitle(warnings)).toEqual('Problem with 1 cluster');
  });

  test('Should show title for multiple non-successful cluster', () => {
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
          remote2: {
            status: 'skipped',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
    ];
    expect(getWarningsTitle(warnings)).toEqual('Problem with 2 clusters');
  });

  test('Should show title for multiple requests', () => {
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
    ];
    expect(getWarningsTitle(warnings)).toEqual('Problem with 1 cluster in 2 requests');
  });
});

describe('getWarningsDescription', () => {
  test('Should show description for single non-successful cluster', () => {
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
    ];
    expect(getWarningsDescription(warnings)).toEqual(
      'This cluster had issues returning data and results might be incomplete.'
    );
  });

  test('Should show description for multiple non-successful cluster', () => {
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
          remote2: {
            status: 'skipped',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: () => {},
      } as SearchResponseWarning,
    ];
    expect(getWarningsDescription(warnings)).toEqual(
      'These clusters had issues returning data and results might be incomplete.'
    );
  });
});
