/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { describeDeployment, getDeploymentInfo } from './deployment_info';

const env = (buildFlavor: 'serverless' | 'traditional') =>
  ({
    packageInfo: { version: '9.7.0', buildFlavor },
  } as unknown as PluginInitializerContext['env']);

const cloud = (overrides: Record<string, unknown> = {}) =>
  ({
    isCloudEnabled: false,
    isServerlessEnabled: false,
    isEce: undefined,
    serverless: {},
    ...overrides,
  } as Parameters<typeof getDeploymentInfo>[1]);

describe('getDeploymentInfo', () => {
  it('is self-managed without the cloud plugin', () => {
    expect(getDeploymentInfo(env('traditional'))).toEqual({
      type: 'self-managed',
      version: '9.7.0',
    });
  });

  it('is self-managed when the cloud plugin says it is not on cloud', () => {
    expect(getDeploymentInfo(env('traditional'), cloud()).type).toBe('self-managed');
  });

  it('is ECH on cloud when it is neither serverless nor ECE', () => {
    expect(getDeploymentInfo(env('traditional'), cloud({ isCloudEnabled: true })).type).toBe('ech');
  });

  it('is ECE on cloud when the cloud plugin says so', () => {
    expect(
      getDeploymentInfo(env('traditional'), cloud({ isCloudEnabled: true, isEce: true })).type
    ).toBe('ece');
  });

  it('is serverless with its project type', () => {
    expect(
      getDeploymentInfo(
        env('serverless'),
        cloud({
          isCloudEnabled: true,
          isServerlessEnabled: true,
          serverless: { projectType: 'observability' },
        })
      )
    ).toEqual({ type: 'serverless', version: '9.7.0', projectType: 'observability' });
  });

  it('is serverless from the build flavor even without the cloud plugin', () => {
    expect(getDeploymentInfo(env('serverless')).type).toBe('serverless');
  });
});

describe('describeDeployment', () => {
  it('names the deployment, the project and the version', () => {
    expect(describeDeployment({ type: 'serverless', version: '9.7.0', projectType: 'es' })).toBe(
      'Elastic Cloud Serverless, es project, version 9.7.0'
    );
    expect(describeDeployment({ type: 'ech', version: '9.7.0' })).toBe(
      'Elastic Cloud Hosted (ECH), version 9.7.0'
    );
  });
});
