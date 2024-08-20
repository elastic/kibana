/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateShortId } from '@kbn/apm-synthtrace-client';
import { randomInt } from 'crypto';

// Utility function to get a random element from an array
const getAtIndexOrRandom = <T>(values: T[], index?: number) =>
  values[index ?? randomInt(values.length)];

// Arrays for data
const IP_ADDRESSES = [
  '223.72.43.22',
  '20.24.184.101',
  '178.173.228.103',
  '147.161.184.179',
  '34.136.92.88',
];

const GEO_COORDINATES = [
  [116.3861, 39.9143],
  [103.8554, 1.3036],
  [139.7425, 35.6164],
  [2.4075, 48.8323],
  [-95.8517, 41.2591],
];

const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

const CLUSTER = [
  { clusterId: generateShortId(), clusterName: 'synth-cluster-1', namespace: 'default' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-2', namespace: 'production' },
  { clusterId: generateShortId(), clusterName: 'synth-cluster-3', namespace: 'kube' },
];

const SERVICE_NAMES = Array(3)
  .fill(null)
  .map((_, idx) => `synth-service-${idx}`);

// Functions to get random elements
export const getCluster = (index?: number) => getAtIndexOrRandom(CLUSTER, index);
export const getIpAddress = (index?: number) => getAtIndexOrRandom(IP_ADDRESSES, index);
export const getGeoCoordinate = (index?: number) => getAtIndexOrRandom(GEO_COORDINATES, index);
export const getCloudProvider = (index?: number) => getAtIndexOrRandom(CLOUD_PROVIDERS, index);
export const getCloudRegion = (index?: number) => getAtIndexOrRandom(CLOUD_REGION, index);
export const getServiceName = (index?: number) => getAtIndexOrRandom(SERVICE_NAMES, index);
