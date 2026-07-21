/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { buildPath } from '@kbn/core-http-browser';
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

import { isDashboardPanel } from '../../common';
import { DASHBOARD_INTERNAL_API_PATH } from '../../common/constants';
import type { DashboardSanitizeResponseBody } from '../../server';
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
          import('../dashboard_app/top_nav/share/export_json/flyout/export_json_flyout'),
          supportsByReference ? embeddable.canUnlinkFromLibrary() : false,
        ]);

        return (
          <ExportJsonFlyout
            title={embeddable.title$.value ?? `${embeddable.type}-${embeddable.uuid}`}
            objectType={embeddable.getTypeDisplayName?.() ?? embeddable.type}
            closeFlyout={closeFlyout}
            isByReference={isByReference}
            getExportJson={(forceExportByValue = false) => {
              if (supportsByReference && forceExportByValue) {
                return embeddable.getSerializedStateByValue();
              } else {
                return embeddable.serializeState();
              }
            }}
            sanitizeState={async (state) => {
              const result = await coreServices.http.post<DashboardSanitizeResponseBody>(
                buildPath(`${DASHBOARD_INTERNAL_API_PATH}/_sanitize`),
                {
                  version: '1',
                  // create a mock dashboard with a single panel to use sanitize route
                  body: JSON.stringify({
                    title: 'Mock Dashboard for Panel Sanitization', // title must have a length of at least 1
                    panels: [
                      {
                        grid: { x: 0, y: 0, w: 1, h: 1 },
                        type: embeddable.type,
                        config: state,
                      },
                    ],
                  }),
                }
              );
              return {
                data:
                  result.data.panels?.length !== 1 || !isDashboardPanel(result.data.panels[0])
                    ? undefined
                    : result.data.panels[0].config,
                warnings: result.warnings ?? [],
              };
            }}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'export_json_flyout',
        focusedPanelId: embeddable.uuid,
        triggerId: `presentationPanelContextMenu-${embeddable.uuid}`,
      },
    });
  }
}
