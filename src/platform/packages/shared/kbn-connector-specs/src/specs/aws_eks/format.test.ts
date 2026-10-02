/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { decodeCaCertificate, trimAssociatedPolicy, trimCluster, trimUpdate } from './format';

describe('format', () => {
  it('decodes a base64 CA and tolerates missing or malformed data', () => {
    expect(decodeCaCertificate(btoa('PEM'))).toBe('PEM');
    expect(decodeCaCertificate(undefined)).toBeUndefined();
    expect(decodeCaCertificate('%%%')).toBeUndefined();
  });

  it('omits the Kubernetes connector target for a cluster without an endpoint', () => {
    expect(trimCluster('us-east-1', { name: 'connected' }).kubernetesConnector).toBeUndefined();
    expect(
      trimCluster('us-east-1', { name: 'c', endpoint: 'https://x.eks.amazonaws.com' })
        .kubernetesConnector
    ).toMatchObject({
      apiUrl: 'https://x.eks.amazonaws.com',
      region: 'us-east-1',
      clusterName: 'c',
    });
  });

  it.each([
    [undefined, false, false],
    ['InProgress', false, false],
    ['Successful', true, true],
    ['Failed', true, false],
    ['Cancelled', true, false],
  ])('derives done and succeeded from status %s', (status, done, succeeded) => {
    expect(trimUpdate({ status })).toMatchObject({ done, succeeded });
  });

  it('derives the policy name from its ARN', () => {
    expect(
      trimAssociatedPolicy({
        policyArn: 'arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy',
      }).policyName
    ).toBe('AmazonEKSViewPolicy');
  });
});
