/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSearchBar } from '@elastic/eui';
import { findClusters } from './find_clusters';
import { LOCAL_CLUSTER_KEY } from './local_cluster';
import { Request } from '../../../../../../common/adapters/request/types';

const request = {
  response: {
    json: {
      rawResponse: {
        _clusters: {
          details: {
            [LOCAL_CLUSTER_KEY]: {
              status: 'successful',
              took: 50,
            },
            remote1: {
              status: 'skipped',
              took: 1000,
            },
            remote2: {
              status: 'failed',
              took: 90,
            },
          },
        },
      },
    },
  },
} as unknown as Request;

describe('findClusters', () => {
  test('should return all clusters when query is not provided', () => {
    const clusters = findClusters(request);
    expect(Object.keys(clusters)).toEqual([LOCAL_CLUSTER_KEY, 'remote1', 'remote2']);
  });

  test('should filter clusters by cluster name', () => {
    const clusters = findClusters(request, EuiSearchBar.Query.parse('remo'));
    expect(Object.keys(clusters)).toEqual(['remote1', 'remote2']);
  });

  test('should filter clusters by cluster name and status', () => {
    const clusters = findClusters(
      request,
      EuiSearchBar.Query.parse('remo status:(successful or skipped)')
    );
    expect(Object.keys(clusters)).toEqual(['remote1']);
  });

  test('should filter by multiple status values', () => {
    const clusters = findClusters(
      request,
      EuiSearchBar.Query.parse('status:(successful or skipped)')
    );
    expect(Object.keys(clusters)).toEqual([LOCAL_CLUSTER_KEY, 'remote1']);
  });
});
