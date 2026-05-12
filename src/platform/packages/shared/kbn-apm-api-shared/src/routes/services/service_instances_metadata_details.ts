/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { Agent, Service, Container, Kubernetes, Host, Cloud } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface ServiceInstanceMetadataDetailsResponse {
  '@timestamp': string;
  agent?: Agent;
  service?: Service;
  container?: Container;
  kubernetes?: Kubernetes;
  host?: Host;
  cloud?: Cloud;
}

export type ServiceInstanceContainerMetadataDetails =
  | {
      kubernetes: Kubernetes;
    }
  | undefined;

export type ServiceInstancesMetadataDetailsRouteResponse = ServiceInstanceMetadataDetailsResponse &
  (ServiceInstanceContainerMetadataDetails | {});

export const serviceInstancesMetadataDetailsRoute =
  defineRoute<ServiceInstancesMetadataDetailsRouteResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
    params: t.type({
      path: t.type({
        serviceName: t.string,
        serviceNodeName: t.string,
      }),
      query: rangeRt,
    }),
  });
