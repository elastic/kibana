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
import type { PanelJsonEntry } from '../panel_json/types';
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

/** Whether the panel can be exported as Dashboards API JSON */
export const apiCanExportJson = (api: unknown | null): api is ExportJSONActionApi =>
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

const getPanelConfig = (panel: ExportJSONActionApi, forceExportByValue: boolean): object =>
  forceExportByValue && apiHasLibraryTransforms(panel)
    ? panel.getSerializedStateByValue()
    : panel.serializeState();

type ExportedPanels = PanelJsonEntry | PanelJsonEntry[];

/**
 * Opens the Export JSON flyout for one panel, exported as a panel entry, or for several panels,
 * exported as an array of panel entries.
 */
export const openPanelsExportJsonFlyout = (panels: ExportJSONActionApi[]): void => {
  const [firstPanel] = panels;
  if (!firstPanel) return;
  const isSinglePanel = panels.length === 1;
  const title = isSinglePanel
    ? firstPanel.title$.value ?? `${firstPanel.type}-${firstPanel.uuid}`
    : i18n.translate('dashboard.actions.exportJson.selectedPanelsTitle', {
        defaultMessage: '{count} panels',
        values: { count: panels.length },
      });

  openLazyFlyout({
    core: coreServices,
    parentApi: firstPanel.parentApi,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const [{ DashboardPanelExportJsonFlyout }, linkedToLibrary] = await Promise.all([
        import('../dashboard_app/top_nav/share/export_json/flyout/export_json_flyout'),
        Promise.all(
          panels.map((panel) =>
            apiHasLibraryTransforms(panel) ? panel.canUnlinkFromLibrary() : false
          )
        ),
      ]);

      return (
        <DashboardPanelExportJsonFlyout<ExportedPanels, ExportedPanels>
          title={title}
          objectType={isSinglePanel ? firstPanel.getTypeDisplayName?.() ?? firstPanel.type : title}
          panelCount={panels.length}
          closeFlyout={closeFlyout}
          isByReference={linkedToLibrary.some(Boolean)}
          getExportJson={(forceExportByValue = false) => {
            const entries = buildPanelJsonEntries(
              panels.map((panel) => ({
                type: panel.type,
                grid: getPanelGrid(panel),
                config: getPanelConfig(panel, forceExportByValue),
              }))
            );
            return isSinglePanel ? entries[0] : entries;
          }}
          sanitizeState={async (state) => {
            const { panels: sanitizedPanels, warnings } = await sanitizePanels(
              Array.isArray(state) ? state : [state]
            );
            // Panels the sanitize route dropped are left out; the warnings say which ones
            const keptPanels = sanitizedPanels.filter(
              (panel): panel is PanelJsonEntry => panel !== undefined
            );
            if (isSinglePanel) return { data: keptPanels[0], warnings };
            return { data: keptPanels.length ? keptPanels : undefined, warnings };
          }}
          titleId={ariaLabelledBy}
        />
      );
    },
    flyoutProps: {
      'data-test-subj': 'export_json_flyout',
      focusedPanelId: isSinglePanel ? firstPanel.uuid : undefined,
    },
  });
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
    return apiCanExportJson(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!apiCanExportJson(embeddable)) throw new IncompatibleActionError();
    openPanelsExportJsonFlyout([embeddable]);
  }
}
