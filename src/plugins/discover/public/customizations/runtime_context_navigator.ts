/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { ApplicationStart } from '@kbn/core-application-browser';
import { DiscoverAppLocator, DiscoverAppLocatorParams } from '../../common';
import { DiscoverRuntimeContext } from './runtime_context';
import { RuntimeContextManager } from './runtime_context_manager';

export interface RuntimeContextNavigationParams extends DiscoverAppLocatorParams {
  runtimeContext: DiscoverRuntimeContext;
}

export interface RuntimeContextNavigationOptions {
  openInNewTab?: boolean;
}

export class RuntimeContextNavigator {
  constructor(
    private readonly contextManager: RuntimeContextManager,
    private readonly locator: DiscoverAppLocator,
    private readonly application: ApplicationStart
  ) {}

  public async navigateWithContext(
    { runtimeContext, ...locatorParams }: RuntimeContextNavigationParams,
    { openInNewTab }: RuntimeContextNavigationOptions = {}
  ) {
    const contextId = uuidv4();
    const { app, path: originalPath, state } = await this.locator.getLocation(locatorParams);
    const path = setQueryParameter(originalPath, 'contextId', contextId);

    this.contextManager.persistContext(contextId, runtimeContext);

    return this.application.navigateToApp(app, { path, state, openInNewTab });
  }
}

const setQueryParameter = (path: string, key: string, value: string) => {
  const [splitPath, search] = path.split('?');
  const searchParams = new URLSearchParams(search);
  searchParams.set(key, value);
  return `${splitPath}?${searchParams.toString()}`;
};
