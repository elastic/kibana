/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

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
  apiSupportsJsonExport,
  type SupportsJsonExport,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { buildPath } from '@kbn/core-http-browser';

import { DASHBOARD_INTERNAL_API_PATH } from '../../common/constants';
import type { PanelSanitizeResponseBody } from '../../server/api/sanitize/types';
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
        const [{ ExportJsonFlyout }, isByReference] = await Promise.all([
          import('../share/export_json/flyout/export_json_flyout'),
          supportsByReference
            ? await embeddable.canUnlinkFromLibrary()
            : await new Promise<boolean>((resolve) => resolve(false)),
        ]);

        return (
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
            sanitizeState={async (state) => {
              const result = await coreServices.http.post<PanelSanitizeResponseBody>(
                buildPath(`${DASHBOARD_INTERNAL_API_PATH}/_sanitize`),
                {
                  version: '1',
                  body: JSON.stringify({ type: embeddable.type, config: state }),
                }
              );
              return {
                data: result.data.config,
                warnings: result.warnings ?? [],
              };
            }}
          />
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
