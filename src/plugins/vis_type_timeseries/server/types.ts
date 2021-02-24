/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, FakeRequest, IUiSettingsClient } from 'src/core/server';
import type { DataRequestHandlerContext } from '../../data/server';
import { VisPayload } from '../common/types';
import { Framework } from './plugin';

export type VisTypeTimeseriesRequestHandlerContext = DataRequestHandlerContext;
export type VisTypeTimeseriesRouter = IRouter<VisTypeTimeseriesRequestHandlerContext>;
export type VisTypeTimeseriesRequest<TPayload = unknown> = FakeRequest & { body: TPayload };
export type VisTypeTimeseriesVisDataRequest = VisTypeTimeseriesRequest<VisPayload>;

export interface VisTypeTimeseriesRequestServices {
  esQueryConfig: any;
  capabilities: any;
  framework: Framework;
  uiSettings: IUiSettingsClient;
  requestContext: VisTypeTimeseriesRequestHandlerContext;
}
