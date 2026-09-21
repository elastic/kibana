/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { map } from 'rxjs';

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type {
  CanLockHoverActions,
  EmbeddableApiContext,
  HasUniqueId,
  PublishesEsql,
} from '@kbn/presentation-publishing';
import { apiHasUniqueId, apiPublishesEsql } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { EsqlNotificationPopover } from './esql_notification_popover';
import { ACTION_ESQL_NOTIFICATION } from './constants';

export type EsqlNotificationActionApi = PublishesEsql & HasUniqueId & Partial<CanLockHoverActions>;

const isApiCompatible = (api: unknown | null): api is EsqlNotificationActionApi =>
  Boolean(apiPublishesEsql(api) && apiHasUniqueId(api));

export const esqlNotificationAction: ActionDefinition<EmbeddableApiContext> = {
  id: ACTION_ESQL_NOTIFICATION,
  type: ACTION_ESQL_NOTIFICATION,
  order: 99,

  MenuItem: ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: coreServices.uiSettings,
    });

    return (
      <KibanaReactContextProvider>
        <EsqlNotificationPopover api={embeddable} />
      </KibanaReactContextProvider>
    );
  },

  getDisplayName: () => '',

  getIconType: () => 'code',

  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) return false;
    return (embeddable.esql$.value ?? []).length > 0;
  },

  couldBecomeCompatible: ({ embeddable }: EmbeddableApiContext) => {
    return apiPublishesEsql(embeddable);
  },

  getCompatibilityChangesSubject: ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) return;
    return embeddable.esql$.pipe(map(() => undefined));
  },

  execute: async () => {},
};
