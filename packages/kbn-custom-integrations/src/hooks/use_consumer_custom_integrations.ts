/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CreateDispatchableEvents,
  useCreateDispatchableEvents,
} from './create/use_create_dispatchable_events';
import { useCustomIntegrations } from './use_custom_integrations';

export const useConsumerCustomIntegrations = () => {
  const { customIntegrationsState } = useCustomIntegrations();
  const dispatchableEvents = useCreateDispatchableEvents({
    machineRef: customIntegrationsState.children.createCustomIntegration,
  });

  return {
    mode: customIntegrationsState.context.mode,
    dispatchableEvents,
  };
};

export type DispatchableEvents = CreateDispatchableEvents;
