/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { Request } from './request';
import { SavedObjectsClient } from './saved_objects_client';
import { SavedObjectsRepository } from './saved_objects_repository';

type SessionHandler = (request: Request, reply: Hapi.IReply) => void;
type Handler = SessionHandler | string | Hapi.IRouteHandlerConfig;

// @ts-ignore
interface RouteAdditionalConfigurationOptions extends Hapi.IRouteAdditionalConfigurationOptions {
  handler?: Handler;
}

// @ts-ignore
interface RouteConfig extends Hapi.IRouteConfiguration {
  handler?: Handler;
  config?: RouteAdditionalConfigurationOptions;
}

export class Server extends Hapi.Server {
  public plugins: {
    elasticsearch: {
      getCluster(
        name: 'admin' | 'data'
      ): {
        callWithRequest: (request: Request, method: string, params: any) => Promise<any>;
        callWithInternalUser: (method: string, params: any) => Promise<any>;
        getClient: () => any;
      };
    };
  };
  public savedObjects: {
    SavedObjectsClient: typeof SavedObjectsClient;
    getSavedObjectsRepository(
      callCluster: (method: string, params: any) => Promise<any>
    ): SavedObjectsRepository;
  };

  // @ts-ignore
  public route(options: RouteConfig | RouteConfig[]): void;

  public config(): {
    get(key: string): any;
  };
}
