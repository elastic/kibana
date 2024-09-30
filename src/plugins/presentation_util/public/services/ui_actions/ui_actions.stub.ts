/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import { PluginServiceFactory } from '../create';
import { PresentationUiActionsService } from './types';

type CapabilitiesServiceFactory = PluginServiceFactory<PresentationUiActionsService>;

export const uiActionsServiceFactory: CapabilitiesServiceFactory = () => {
  const { getTriggerCompatibleActions } = uiActionsPluginMock.createStartContract();
  return { getTriggerCompatibleActions };
};
