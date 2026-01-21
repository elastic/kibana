/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

export type ElasticsearchClientWrapperFactory = (client: Client) => Client;

interface GetElasticsearchClientWrapperFactoryParams {
  failOn: (methodName: string, methodArguments: any[]) => boolean;
  errorDelaySeconds?: number;
}

export const getElasticsearchClientWrapperFactory = ({
  failOn,
  errorDelaySeconds,
}: GetElasticsearchClientWrapperFactoryParams): ElasticsearchClientWrapperFactory => {
  const interceptClientMethod = (methodName: string, method: any): any => {
    return new Proxy(method, {
      apply: (applyTarget, thisArg, methodArguments) => {
        if (failOn(methodName, methodArguments)) {
          return new Promise((_, reject) =>
            setTimeout(
              () => reject(`Error: esClient.${methodName}() failed unexpectedly`),
              (errorDelaySeconds || 0) * 1000
            )
          );
        }
        return Reflect.apply(applyTarget, thisArg, methodArguments);
      },
    });
  };

  const interceptClientApi = (apiName: string, api: any): any =>
    new Proxy(api, {
      get(target, prop) {
        return typeof target[prop] === 'function'
          ? interceptClientMethod(`${apiName}.${prop.toString()}`, target[prop])
          : target[prop];
      },
    });

  const wrapClient = (client: Client): any =>
    new Proxy(client, {
      get(target, prop, receiver) {
        switch (prop) {
          // intercept top level esClient methods
          case 'bulk':
          case 'deleteByQuery':
          case 'info':
          case 'search':
          case 'updateByQuery':
            const clientMethod = Reflect.get(target, prop, receiver);
            return interceptClientMethod(prop, clientMethod);
          // intercept esClient APIs
          case 'cluster':
          case 'indices':
          case 'tasks':
            const clientApi = Reflect.get(target, prop, receiver);
            return interceptClientApi(prop, clientApi);
          // proxy child Clients too
          case 'child':
            return new Proxy(target[prop], {
              apply(applyTarget, thisArg, argArray) {
                const childClient = Reflect.apply(applyTarget, thisArg, argArray);
                return wrapClient(childClient);
              },
            });
          // do NOT intercept the rest of properties and symbols
          default:
            return Reflect.get(target, prop, receiver);
        }
      },
    });

  return wrapClient;
};
