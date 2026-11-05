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

import type { DashboardApi } from '../dashboard_api/types';
import { buildPanelJsonEntries } from '../panel_json/build_panel_json_entries';
import { sanitizePanels } from '../panel_json/sanitize_panels';
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

const apiCanGetDashboardPanel = (
  api: unknown
): api is Pick<DashboardApi, 'getDashboardPanelFromId'> =>
  typeof (api as Partial<Pick<DashboardApi, 'getDashboardPanelFromId'>>)
    ?.getDashboardPanelFromId === 'function';

const getPanelGrid = ({ parentApi, uuid }: ExportJSONActionApi) => {
  if (!apiCanGetDashboardPanel(parentApi)) return undefined;
  try {
    return parentApi.getDashboardPanelFromId(uuid).grid;
  } catch {
    // The panel isn't in the dashboard layout, so it's exported with the default size
    return undefined;
  }
};

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
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        const [{ DashboardPanelExportJsonFlyout }, isByReference] = await Promise.all([
          import('../dashboard_app/top_nav/share/export_json/flyout/export_json_flyout'),
          supportsByReference ? embeddable.canUnlinkFromLibrary() : false,
        ]);

        return (
          <DashboardPanelExportJsonFlyout
            title={embeddable.title$.value ?? `${embeddable.type}-${embeddable.uuid}`}
            objectType={embeddable.getTypeDisplayName?.() ?? embeddable.type}
            closeFlyout={closeFlyout}
            isByReference={isByReference}
            getExportJson={(forceExportByValue = false) => {
              const config =
                supportsByReference && forceExportByValue
                  ? embeddable.getSerializedStateByValue()
                  : embeddable.serializeState();
              const [panel] = buildPanelJsonEntries([
                { type: embeddable.type, grid: getPanelGrid(embeddable), config },
              ]);
              return panel;
            }}
            sanitizeState={async (panel) => {
              const {
                panels: [sanitizedPanel],
                warnings,
              } = await sanitizePanels([panel]);
              return { data: sanitizedPanel, warnings };
            }}
            titleId={ariaLabelledBy}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'export_json_flyout',
        focusedPanelId: embeddable.uuid,
      },
    });
  }
}
