/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ServiceIdentifier,
  ServiceLabel,
  ByIdInjection,
  ByLabelInjection,
  InjectionParameter,
} from './types';

export function serviceId<T = unknown>(
  id: ServiceIdentifier<T>,
  {
    optional = false,
  }: {
    optional?: boolean;
  } = {}
): ByIdInjection<T> {
  return {
    type: 'serviceId',
    serviceId: id,
    optional,
  };
}

export function serviceLabel<T = unknown>(label: ServiceLabel<T>): ByLabelInjection {
  return {
    type: 'serviceLabel',
    serviceLabel: label,
  };
}

export function isServiceIdParam(param: InjectionParameter): param is ByIdInjection {
  return param.type === 'serviceId';
}

export function isServiceLabelParam(param: InjectionParameter): param is ByLabelInjection {
  return param.type === 'serviceLabel';
}
