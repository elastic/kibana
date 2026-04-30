/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 as generateId } from 'uuid';
import type { HasPanelCapabilities, HasSerializedChildState } from '@kbn/presentation-publishing';
import { i18n } from '@kbn/i18n';
import type { DefaultEmbeddableApi, EmbeddableApiRegistration, EmbeddableFactory } from './types';
import type { PhaseTracker } from './phase_tracker';
import { initializeDrilldownsManager } from '../drilldowns/drilldowns_manager';

export async function buildEmbeddable<
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>
>({
  factory,
  maybeId,
  parentApi,
  phaseTracker,
  type,
}: {
  factory?: EmbeddableFactory<SerializedState, Api>;
  maybeId?: string;
  parentApi: HasSerializedChildState<SerializedState>;
  phaseTracker: PhaseTracker;
  type: string;
}) {
  const uuid = maybeId ?? generateId();

  const finalizeApi = (apiRegistration: EmbeddableApiRegistration<SerializedState, Api>) => {
    const hasLockedHoverActions$ = new BehaviorSubject(false);
    const panelCapabilitiesDefaults: HasPanelCapabilities = {
      isExpandable: true,
      isDuplicable: true,
      isCustomizable: true,
      isPinnable: false,
    };
    return {
      // Spread default panel capabilities first, allow apiRegistration to override them
      ...panelCapabilitiesDefaults,
      ...apiRegistration,
      uuid,
      phase$: phaseTracker.getPhase$(),
      parentApi,
      hasLockedHoverActions$,
      lockHoverActions: (lock: boolean) => {
        hasLockedHoverActions$.next(lock);
      },
      type,
    } as unknown as Api;
  };

  try {
    if (!factory) {
      throw new Error(
        i18n.translate('embeddableApi.reactEmbeddable.factoryNotFoundError', {
          defaultMessage: 'No embeddable factory found for type: {key}',
          values: { key: type },
        })
      );
    }
    const initialState = parentApi.getSerializedStateForChild(uuid) ?? ({} as SerializedState);
    const { api, Component } = await factory.buildEmbeddable({
      initialState,
      finalizeApi,
      uuid,
      parentApi,
      initializeDrilldownsManager,
    });
    return { componentApi: api, Component };
  } catch (e) {
    /**
     * critical error encountered when trying to build the api / embeddable;
     * since no API is available, create a dummy API that allows the panel to be deleted
     * */
    return {
      componentApi: finalizeApi({
        blockingError$: new BehaviorSubject(e),
      } as unknown as EmbeddableApiRegistration<SerializedState, Api>),
      Component: () => <span />,
    };
  }
}
