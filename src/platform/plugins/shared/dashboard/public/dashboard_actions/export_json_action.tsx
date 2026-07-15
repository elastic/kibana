/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { apiSupportsJsonExport, type SupportsJsonExport } from '@kbn/as-code-export-utils';
import { EXPORT_ACTION_GROUP } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableApiContext,
  HasLibraryTransforms,
  HasParentApi,
  HasSerializableState,
  HasType,
  HasTypeDisplayName,
  HasUniqueId,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import {
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiHasType,
  apiHasUniqueId,
  apiPublishesTitle,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { coreServices } from '../services/kibana_services';
import { ACTION_EXPORT_JSON } from './constants';

export type ExportJSONActionApi = SupportsJsonExport &
  HasUniqueId &
  HasType &
  PublishesTitle &
  HasSerializableState &
  Partial<HasParentApi> &
  Partial<HasTypeDisplayName> &
  Partial<HasLibraryTransforms>;

const isApiCompatible = (api: unknown | null): api is ExportJSONActionApi =>
  Boolean(
    apiSupportsJsonExport(api) &&
      apiHasUniqueId(api) &&
      apiHasType(api) &&
      apiPublishesTitle(api) &&
      apiHasSerializableState(api)
  );

export class ExportJSONAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_EXPORT_JSON;
  public readonly type = ACTION_EXPORT_JSON;
  public readonly order = 1;
  public grouping = [EXPORT_ACTION_GROUP];

  public getIconType() {
    return 'code';
  }

  public readonly getDisplayName = (context: EmbeddableApiContext): string =>
    i18n.translate('dashboard.actions.exportJsonDisplayName', {
      defaultMessage: 'Export JSON',
    });

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    return isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const supportsByReference = apiHasLibraryTransforms(embeddable);

    openLazyFlyout({
      core: coreServices,
      parentApi: embeddable.parentApi,
      loadContent: async ({ closeFlyout }) => {
        const [{ ExportJsonFlyoutContext, ExportJsonFlyout }, isByReference] = await Promise.all([
          import('@kbn/as-code-export-utils'),
          supportsByReference && (await embeddable.canUnlinkFromLibrary()),
        ]);
        return (
          <ExportJsonFlyoutContext.Provider value={{ services: { core: coreServices } }}>
            <ExportJsonFlyout
              apiPath={embeddable.apiPath}
              title={embeddable.title$.value ?? `${embeddable.type}-${embeddable.uuid}`}
              objectType={embeddable.getTypeDisplayName?.() ?? embeddable.type}
              closeFlyout={closeFlyout}
              isByReference={isByReference}
              exportJson={(byReference = false) => {
                if (supportsByReference && !byReference) {
                  return embeddable.getSerializedStateByValue();
                } else {
                  return embeddable.serializeState();
                }
              }}
            />
            ;
          </ExportJsonFlyoutContext.Provider>
        );
      },
      flyoutProps: {
        'data-test-subj': 'create_esql_control_flyout',
        focusedPanelId: embeddable.uuid,
        triggerId: `presentationPanelContextMenu-${embeddable.uuid}`,
      },
    });
  }
}
