/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-server-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';

/** @internal */
type CrossProjectExpressionGetter = (spaceId: string) => Promise<string>;

/** @internal */
interface CrossProjectServiceDeps {
  getCrossProjectExpression: CrossProjectExpressionGetter;
  http: InternalHttpServiceSetup;
}

const DEFAULT_EXPRESSION = 'local';

/** @internal */
interface CrossProjectServiceSetup {
  asInternal: () => string;
  asScoped: (request: KibanaRequest) => Promise<string>;
}

export class CrossProjectService implements CoreService<CrossProjectServiceSetup, void> {
  private getCrossProjectExpression: CrossProjectExpressionGetter;

  constructor() {
    this.getCrossProjectExpression = () => {
      throw new Error('CrossProjectExpressionGetter not set');
    };
  }

  public setup(deps: CrossProjectServiceDeps): CrossProjectServiceSetup {
    const { basePath } = deps.http;
    return {
      asInternal: () => DEFAULT_EXPRESSION,
      asScoped: (request: KibanaRequest) => {
        const { spaceId } = getSpaceIdFromPath(basePath.get(request), basePath.serverBasePath);
        return this.getCrossProjectExpression(spaceId);
      },
    };
  }

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public stop(): Promise<void> {
    return Promise.resolve();
  }
}
