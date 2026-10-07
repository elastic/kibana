/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildClusterAccessUpdateBody,
  buildClusterUpdateBody,
  buildNodegroupUpdateBody,
  clusterAccessUpdateNeedsCurrent,
  nodegroupUpdateNeedsCurrent,
} from './payloads';
import type {
  EksCluster,
  EksNodegroup,
  UpdateClusterAccessConfigInput,
  UpdateClusterConfigInput,
} from './types';
import { UpdateNodegroupConfigInputSchema } from './types';

const ref = { clusterName: 'prod-eu', nodegroupName: 'workers' };
const nodegroupInput = (raw: Record<string, unknown>) =>
  UpdateNodegroupConfigInputSchema.parse({ ...ref, ...raw });

const current: EksNodegroup = {
  scalingConfig: { minSize: 2, maxSize: 10, desiredSize: 4 },
  updateConfig: { maxUnavailablePercentage: 33, updateStrategy: 'MINIMAL' },
  nodeRepairConfig: { enabled: true, maxUnhealthyNodeThresholdCount: 3 },
};

describe('nodegroup update body', () => {
  it('reads the current node group only for sub-objects EKS replaces whole', () => {
    expect(nodegroupUpdateNeedsCurrent(nodegroupInput({ labelsToRemove: ['a'] }))).toBe(false);
    expect(nodegroupUpdateNeedsCurrent(nodegroupInput({ desiredSize: 3 }))).toBe(true);
    expect(nodegroupUpdateNeedsCurrent(nodegroupInput({ updateStrategy: 'DEFAULT' }))).toBe(true);
    expect(nodegroupUpdateNeedsCurrent(nodegroupInput({ nodeRepairEnabled: false }))).toBe(true);
  });

  it('fills every unset scaling field from the current config', () => {
    expect(
      buildNodegroupUpdateBody(nodegroupInput({ desiredSize: 6 }), current).scalingConfig
    ).toEqual({ minSize: 2, maxSize: 10, desiredSize: 6 });
  });

  it('checks the merged scaling bounds', () => {
    expect(() => buildNodegroupUpdateBody(nodegroupInput({ maxSize: 1 }), current)).toThrow(
      'minSize 2 exceeds maxSize 1'
    );
    expect(() => buildNodegroupUpdateBody(nodegroupInput({ minSize: 5 }), current)).toThrow(
      'desiredSize 4 is outside minSize 5 and maxSize 10'
    );
  });

  it('replaces the unavailability limit of either kind and keeps the strategy', () => {
    expect(
      buildNodegroupUpdateBody(nodegroupInput({ maxUnavailable: 2 }), current).updateConfig
    ).toEqual({ maxUnavailable: 2, updateStrategy: 'MINIMAL' });
    expect(
      buildNodegroupUpdateBody(nodegroupInput({ updateStrategy: 'DEFAULT' }), current).updateConfig
    ).toEqual({ maxUnavailablePercentage: 33, updateStrategy: 'DEFAULT' });
  });

  it('keeps the node repair thresholds when toggling repair', () => {
    expect(
      buildNodegroupUpdateBody(nodegroupInput({ nodeRepairEnabled: false }), current)
        .nodeRepairConfig
    ).toEqual({ enabled: false, maxUnhealthyNodeThresholdCount: 3 });
  });

  it('works without a current resource', () => {
    expect(buildNodegroupUpdateBody(nodegroupInput({ desiredSize: 1 }))).toEqual({
      scalingConfig: { desiredSize: 1 },
      labels: undefined,
      taints: undefined,
      updateConfig: undefined,
      nodeRepairConfig: undefined,
    });
  });
});

describe('cluster update body', () => {
  const cluster: EksCluster = {
    resourcesVpcConfig: {
      endpointPublicAccess: true,
      endpointPrivateAccess: false,
      publicAccessCidrs: ['198.51.100.0/24'],
    },
  };
  const accessInput = (
    raw: Partial<UpdateClusterAccessConfigInput>
  ): UpdateClusterAccessConfigInput => ({ clusterName: 'prod-eu', ...raw });

  it('reads the current cluster only for endpoint changes', () => {
    expect(clusterAccessUpdateNeedsCurrent(accessInput({ authenticationMode: 'API' }))).toBe(false);
    expect(clusterAccessUpdateNeedsCurrent(accessInput({ endpointPrivateAccess: true }))).toBe(
      true
    );
  });

  it('keeps the endpoint flags and allowlist it was not asked to change', () => {
    expect(
      buildClusterAccessUpdateBody(accessInput({ endpointPrivateAccess: true }), cluster)
        .resourcesVpcConfig
    ).toEqual({
      endpointPublicAccess: true,
      endpointPrivateAccess: true,
      publicAccessCidrs: ['198.51.100.0/24'],
    });
  });

  it('drops the allowlist when the public endpoint is turned off', () => {
    expect(
      buildClusterAccessUpdateBody(
        accessInput({ endpointPublicAccess: false, endpointPrivateAccess: true }),
        cluster
      ).resourcesVpcConfig
    ).toEqual({ endpointPublicAccess: false, endpointPrivateAccess: true });
  });

  it('sends the authentication mode on its own', () => {
    expect(buildClusterAccessUpdateBody(accessInput({ authenticationMode: 'API' }))).toEqual({
      accessConfig: { authenticationMode: 'API' },
      resourcesVpcConfig: undefined,
    });
  });

  it.each<[string, Partial<UpdateClusterConfigInput>, Record<string, unknown>]>([
    [
      'logging',
      { enableLogTypes: ['audit'] },
      { logging: { clusterLogging: [{ types: ['audit'], enabled: true }] } },
    ],
    ['upgrade policy', { supportType: 'STANDARD' }, { upgradePolicy: { supportType: 'STANDARD' } }],
    ['deletion protection', { deletionProtection: true }, { deletionProtection: true }],
  ])('builds a %s-only config body', (_, raw, expected) => {
    expect(buildClusterUpdateBody({ clusterName: 'prod-eu', ...raw })).toEqual({
      logging: undefined,
      upgradePolicy: undefined,
      deletionProtection: undefined,
      ...expected,
    });
  });
});
