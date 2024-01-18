/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentStorage } from '../core';

type GetParameters = Parameters<ContentStorage['get']>;
type ClientGetParameters = [GetParameters[1], GetParameters[2]?];

// PLAN
/*

interface IContentClient {
  // Basically the API of ContentStorage, **without** the first storageCtx argument on the methods
  get(...params: ClientGetParameters): ReturnType<ContentStorage['get']>;
}

// Have a factory to create a client for a specific content type

const dashboardClientFactory = getClientFactory('dashboard');

export const contentClient = {
  getForRequest,
}

// Initiate a client instance passing partial StorageContext
const client: IContentClient = dashboardClientFactory.getForRequest({
  requestHandlerContext,
  version, // optional, if not passed will use the latest version
});

// We can then
- 1. Create the RPC context (see src/plugins/content_management/server/rpc/routes/routes.ts)
- 2. With the RPC context, create the StorageContext with getStorageContext() (src/plugins/content_management/server/rpc/procedures/utils.ts)

*/

interface IContentClient {
  // Basically the API of ContentStorage, **without** the first storageCtx argument on the methods
  get(...params: ClientGetParameters): ReturnType<ContentStorage['get']>;
}

// export class ContentClient implements IContentClient {}
