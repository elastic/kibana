/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noDataPagePublicMock } from '@kbn/no-data-page-plugin/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { NoDataPageService } from './types';

export type NoDataPageServiceFactory = PluginServiceFactory<NoDataPageService>;

export const noDataPageServiceFactory: NoDataPageServiceFactory = () =>
  noDataPagePublicMock.createSetup();
