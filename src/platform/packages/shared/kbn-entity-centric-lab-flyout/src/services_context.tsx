/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

/**
 * Services consumed by the entity-centric lab flyout and its tabs. Hosting
 * plugins (Discover, Streams app) build this object from their own start
 * dependencies and pass it through {@link EntityFlyoutServicesProvider}.
 *
 * `agentBuilder` is optional — when not provided, the "Add to chat" button
 * is hidden and the flyout does not register any chat config.
 */
export interface EntityFlyoutServices {
  readonly agentBuilder?: AgentBuilderPluginStart;
  readonly notifications: NotificationsStart;
  readonly charts: ChartsPluginStart;
}

const EntityFlyoutServicesContext = createContext<EntityFlyoutServices | null>(null);

export const EntityFlyoutServicesProvider = ({
  services,
  children,
}: PropsWithChildren<{ readonly services: EntityFlyoutServices }>) => (
  <EntityFlyoutServicesContext.Provider value={services}>
    {children}
  </EntityFlyoutServicesContext.Provider>
);

export const useEntityFlyoutServices = (): EntityFlyoutServices => {
  const ctx = useContext(EntityFlyoutServicesContext);
  if (!ctx) {
    throw new Error(
      '`useEntityFlyoutServices` must be used inside an `EntityFlyoutServicesProvider`.'
    );
  }
  return ctx;
};
