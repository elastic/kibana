/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CPSProject } from '@kbn/cps-utils';
import { joinClustersToProjects } from './join_clusters_to_projects';

const originProject: CPSProject = {
  _id: 'origin-id',
  _alias: 'my-origin-project',
  _type: 'observability',
  _organisation: 'my-org',
  _csp: 'aws',
  _region: 'us-east-1',
};

const linkedProject: CPSProject = {
  _id: 'linked-id',
  _alias: 'my-project-b72b95',
  _type: 'security',
  _organisation: 'my-org',
  _csp: 'azure',
  _region: 'eastus2',
  team: 'search',
};

const clusterDetails = (took: number): estypes.ClusterDetails => ({
  status: 'successful',
  indices: 'kibana_sample_data_logs',
  took,
  timed_out: false,
  _shards: {
    total: 2,
    successful: 2,
    skipped: 0,
    failed: 0,
  },
});

describe('joinClustersToProjects', () => {
  test('should join a cluster to the linked project whose alias matches the cluster key', () => {
    const items = joinClustersToProjects(
      { 'my-project-b72b95': clusterDetails(7) },
      originProject,
      [linkedProject]
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: 'my-project-b72b95',
      name: 'my-project-b72b95',
      status: 'successful',
      responseTime: 7,
      isOrigin: false,
      project: linkedProject,
      provider: 'Azure',
      region: 'eastus2',
      tags: ['team: search'],
    });
  });

  test('should map the _origin cluster key to the origin project', () => {
    const items = joinClustersToProjects({ _origin: clusterDetails(3) }, originProject, [
      linkedProject,
    ]);

    expect(items[0]).toMatchObject({
      key: '_origin',
      name: 'my-origin-project',
      isOrigin: true,
      project: originProject,
      provider: 'AWS',
      region: 'us-east-1',
    });
  });

  test('should map the (local) cluster key to the origin project', () => {
    const items = joinClustersToProjects({ '(local)': clusterDetails(3) }, originProject, []);

    expect(items[0]).toMatchObject({
      key: '(local)',
      name: 'my-origin-project',
      isOrigin: true,
      project: originProject,
    });
  });

  test('should still list a cluster without a matching project, unenriched', () => {
    const items = joinClustersToProjects({ 'remote-cluster': clusterDetails(11) }, originProject, [
      linkedProject,
    ]);

    expect(items[0]).toMatchObject({
      key: 'remote-cluster',
      name: 'remote-cluster',
      isOrigin: false,
      project: undefined,
      provider: undefined,
      region: undefined,
      tags: [],
    });
  });

  test('should render origin rows unenriched when there is no projects data', () => {
    const items = joinClustersToProjects(
      { _origin: clusterDetails(3), 'my-project-b72b95': clusterDetails(7) },
      null,
      []
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      key: '_origin',
      name: '_origin',
      isOrigin: true,
      project: undefined,
    });
    expect(items[1]).toMatchObject({
      key: 'my-project-b72b95',
      name: 'my-project-b72b95',
      isOrigin: false,
      project: undefined,
    });
  });
});
