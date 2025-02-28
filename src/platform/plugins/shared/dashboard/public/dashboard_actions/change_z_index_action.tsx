/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import { apiPublishesSettings, PublishesSettings } from '@kbn/presentation-containers';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiPublishesViewMode,
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { coreServices } from '../services/kibana_services';
import { ChangeZIndexPopover } from './change_z_index_popover';
import { ACTION_CHANGE_Z_INDEX, DASHBOARD_ACTION_GROUP } from './constants';
import { combineLatest, map, skip } from 'rxjs';

interface CanIncreaseZIndex {
  bringToFront: (panelId: string) => void;
  sendToBack: (panelId: string) => void;
}

export type ChangeZIndexActionApi = HasUniqueId &
  HasParentApi<CanIncreaseZIndex & PublishesSettings & PublishesViewMode>;

const isApiCompatible = (api: unknown | null): api is ChangeZIndexActionApi =>
  Boolean(
    apiHasUniqueId(api) &&
      apiHasParentApi(api) &&
      (api.parentApi as CanIncreaseZIndex).bringToFront &&
      (api.parentApi as CanIncreaseZIndex).sendToBack &&
      apiPublishesSettings(api.parentApi) &&
      api.parentApi.settings.lockToGrid$.getValue() === false &&
      apiPublishesViewMode(api.parentApi) &&
      api.parentApi.viewMode$.getValue() === 'edit'
  );

export class ChangeZIndexAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_CHANGE_Z_INDEX;
  public readonly id = ACTION_CHANGE_Z_INDEX;
  public order = 9;
  public grouping = [DASHBOARD_ACTION_GROUP];

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) return null;

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: coreServices.uiSettings,
    });
    return (
      <KibanaReactContextProvider>
        <ChangeZIndexPopover api={embeddable} />
      </KibanaReactContextProvider>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    return 'Order';
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    return 'layers';
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable)
      ? combineLatest([
          embeddable.parentApi.settings.lockToGrid$,
          embeddable.parentApi.viewMode$,
        ]).pipe(
          skip(1),
          map(() => undefined)
        )
      : undefined;
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public execute = async () => {}; // noops
}
