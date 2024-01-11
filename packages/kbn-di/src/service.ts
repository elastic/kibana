/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Only string for now.
 */
export type ServiceIdentifier<T = unknown> = string;

export type ServiceScope = 'global' | 'container';

// TODO from here

/**
 *
 * Use the `serviceId` helper function to build
 */
interface ServiceIdParameter {
  type: 'serviceId';
  serviceId: string;
}

/**
 *
 * Use the `serviceMarker` helper function to build
 */
interface ServiceMarkerParameter {
  type: 'serviceMarker';
  serviceMarker: string;
}

export type InjectionParameter = ServiceIdParameter | ServiceMarkerParameter;

export function serviceId(id: string): ServiceIdParameter {
  return {
    type: 'serviceId',
    serviceId: id,
  };
}

export function serviceMarker(marker: string): ServiceMarkerParameter {
  return {
    type: 'serviceMarker',
    serviceMarker: marker,
  };
}

export function isServiceIdParam(param: InjectionParameter): param is ServiceIdParameter {
  return param.type === 'serviceId';
}

export function isServiceMarkerParam(param: InjectionParameter): param is ServiceMarkerParameter {
  return param.type === 'serviceMarker';
}
