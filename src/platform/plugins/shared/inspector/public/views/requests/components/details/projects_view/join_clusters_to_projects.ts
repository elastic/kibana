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
import { getCSPLabel, getProjectTags } from '@kbn/cps-utils';
import { LOCAL_CLUSTER_KEY } from '../clusters_view/local_cluster';
import type { ClusterHealthStatus } from '../clusters_view/clusters_health';

// Cluster key Elasticsearch uses for the origin project in CPS responses
export const ORIGIN_CLUSTER_KEY = '_origin';

export interface ProjectClusterItem {
  key: string;
  name: string;
  status: ClusterHealthStatus;
  responseTime?: number;
  isOrigin: boolean;
  project?: CPSProject;
  provider?: string;
  region?: string;
  tags: string[];
  clusterDetails: estypes.ClusterDetails;
}

/**
 * Joins the per-cluster details of an ES response with CPS project metadata.
 * Cluster keys in CPS responses are project aliases, except the origin project
 * which appears as `_origin` (or `(local)` when the response has no `_clusters`
 * section). Clusters without a matching project are still listed, unenriched.
 */
export function joinClustersToProjects(
  clusters: Record<string, estypes.ClusterDetails>,
  originProject: CPSProject | null,
  linkedProjects: CPSProject[]
): ProjectClusterItem[] {
  return Object.entries(clusters).map(([key, clusterDetails]) => {
    const isOriginKey = key === ORIGIN_CLUSTER_KEY || key === LOCAL_CLUSTER_KEY;
    const project = isOriginKey
      ? originProject ?? undefined
      : linkedProjects.find(({ _alias }) => _alias === key) ??
        (originProject?._alias === key ? originProject : undefined);

    return {
      key,
      name: project?._alias ?? key,
      status: clusterDetails.status as ClusterHealthStatus,
      responseTime: clusterDetails.took ?? undefined,
      isOrigin: isOriginKey || (project !== undefined && project === originProject),
      project,
      provider: project?._csp ? getCSPLabel(project._csp) : undefined,
      region: project?._region,
      tags: project
        ? getProjectTags(project).map(({ tagName, tagValue }) => `${tagName}: ${tagValue}`)
        : [],
      clusterDetails,
    };
  });
}
