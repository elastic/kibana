/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { ImportJsonValidationError } from '@kbn/as-code-import-flyout-component';

import type { DashboardApi } from '../../dashboard_api/types';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import {
  apiCanExportJson,
  getPanelsJsonEntries,
  type ExportJSONActionApi,
} from '../../dashboard_actions/export_json_action';
import { getPanelAddedSuccessString } from '../../dashboard_app/_dashboard_app_strings';
import { panelJsonStrings } from '../../panel_json/_panel_json_strings';
import { addImportedPanels, sanitizeImportedPanels } from '../../panel_json/import_panels';
import { normalizeImportedPanels } from '../../panel_json/normalize_imported_panels';
import { sanitizePanels } from '../../panel_json/sanitize_panels';
import type { PanelJsonEntry } from '../../panel_json/types';
import { coreServices } from '../../services/kibana_services';
import { getPanelName } from '../../utils/get_panel_name';
import { getCopiedPanelsWarningText } from './copied_panels_warning';
import { isSelectionModifier } from './selection_modifier';
import { PANEL_FLYOUT_SELECTOR } from './use_panel_selection_gestures';

/** Copy and paste while focus is here belong to that element (a text field, a menu, a flyout) */
const CLIPBOARD_OWNED_BY_TARGET_SELECTOR = [
  '[data-euiportal]',
  PANEL_FLYOUT_SELECTOR,
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(', ');

const isOwnedByTarget = (target: EventTarget | null) =>
  target instanceof Element && target.closest(CLIPBOARD_OWNED_BY_TARGET_SELECTOR) !== null;

const hasTextSelection = () => {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
};

/**
 * Writes text that is still being built. Passing a promise to `ClipboardItem` keeps the write
 * inside the key press, which browsers require; `writeText` is the fallback where it is missing.
 */
const writeToClipboard = async (text: Promise<string>): Promise<void> => {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': text.then((value) => new Blob([value], { type: 'text/plain' })),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(await text);
};

/** Parses clipboard text as panel JSON, or returns undefined when it is anything else. */
const parsePanelJson = (text: string): unknown => {
  try {
    const raw: unknown = JSON.parse(text);
    normalizeImportedPanels(raw);
    return raw;
  } catch {
    return undefined;
  }
};

/** Copies the full configuration of the selected panels that support JSON export. */
export const copySelectedPanels = async (dashboardApi: DashboardApi): Promise<void> => {
  const { toasts } = coreServices.notifications;
  const children = dashboardApi.children$.value;
  const selectedPanelIds = dashboardApi.selectedPanelIds$.value;
  const panels = selectedPanelIds
    .map((panelId) => children[panelId])
    .filter((panel): panel is ExportJSONActionApi => apiCanExportJson(panel));
  const skippedPanelNames = selectedPanelIds
    .filter((panelId) => !apiCanExportJson(children[panelId]))
    .map((panelId) => getPanelName(children[panelId], panelId));

  const sanitized = sanitizePanels(getPanelsJsonEntries(panels, true)).then((result) => ({
    ...result,
    panels: result.panels.filter((panel): panel is PanelJsonEntry => panel !== undefined),
  }));

  try {
    await writeToClipboard(
      sanitized.then(({ panels: copiedPanels }) => {
        if (copiedPanels.length === 0) {
          throw new Error(panelJsonStrings.getNoPanelsCanBeCopiedError());
        }
        return JSON.stringify(copiedPanels, null, 2);
      })
    );
  } catch (error) {
    toasts.addDanger({
      title: panelJsonStrings.getCopyPanelsErrorTitle(),
      text: error instanceof Error ? error.message : undefined,
    });
    return;
  }

  const { panels: copiedPanels, warnings } = await sanitized;
  const title = panelJsonStrings.getPanelsCopiedSuccess(copiedPanels.length);
  if (skippedPanelNames.length === 0 && warnings.length === 0) {
    toasts.addSuccess({ title, 'data-test-subj': 'dashboardPanelsCopiedSuccess' });
    return;
  }
  toasts.addWarning({
    title,
    text: getCopiedPanelsWarningText({ skippedPanelNames, warningCount: warnings.length }),
    'data-test-subj': 'dashboardPanelsCopiedWarning',
  });
};

/** Adds panels from clipboard panel JSON, the same way as the "From JSON" tab of the add panel flyout. */
export const pastePanels = async (dashboardApi: DashboardApi, raw: unknown): Promise<void> => {
  const { toasts } = coreServices.notifications;
  try {
    const { data, warnings, relatedItems = [] } = await sanitizeImportedPanels(raw);
    const { title } = addImportedPanels(dashboardApi, data);
    const missingDataViewCount = relatedItems.filter(({ isMissing }) => isMissing).length;
    const details = [
      ...(warnings.length > 0 ? [panelJsonStrings.getWarningsSummary(warnings.length)] : []),
      ...(missingDataViewCount > 0
        ? [panelJsonStrings.getMissingDataViewsSummary(missingDataViewCount)]
        : []),
    ];
    const successTitle =
      data.panels.length > 1
        ? panelJsonStrings.getPanelsAddedSuccess(data.panels.length)
        : getPanelAddedSuccessString(title);
    if (details.length === 0) {
      toasts.addSuccess({
        title: successTitle,
        'data-test-subj': 'addEmbeddableToDashboardSuccess',
      });
      return;
    }
    toasts.addWarning({
      title: successTitle,
      text: details.join(' '),
      'data-test-subj': 'addEmbeddableToDashboardSuccess',
    });
  } catch (error) {
    if (error instanceof ImportJsonValidationError) {
      toasts.addDanger({ title: panelJsonStrings.getAddPanelErrorTitle(), text: error.message });
      return;
    }
    toasts.addError(error instanceof Error ? error : new Error(String(error)), {
      title: panelJsonStrings.getAddPanelErrorTitle(),
    });
  }
};

/**
 * Cmd/Ctrl+C copies the selected panels to the clipboard as JSON, with their full configuration,
 * and Cmd/Ctrl+V adds panels from panel JSON on the clipboard. Copying and pasting text is left alone.
 */
export const usePanelClipboardShortcuts = ({ enabled }: { enabled: boolean }): void => {
  const dashboardApi = useDashboardApi();

  useEffect(() => {
    if (!enabled) return;

    const isShortcutAvailable = (event: Event) =>
      !event.defaultPrevented && !dashboardApi.hasOverlays$.value && !isOwnedByTarget(event.target);

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'c' ||
        !isSelectionModifier(event) ||
        event.shiftKey ||
        event.altKey ||
        event.repeat ||
        dashboardApi.selectedPanelIds$.value.length === 0 ||
        !isShortcutAvailable(event) ||
        hasTextSelection()
      ) {
        return;
      }
      const children = dashboardApi.children$.value;
      const canCopyAny = dashboardApi.selectedPanelIds$.value.some((panelId) =>
        apiCanExportJson(children[panelId])
      );
      event.preventDefault();
      if (!canCopyAny) {
        coreServices.notifications.toasts.addWarning({
          title: panelJsonStrings.getNoPanelsCanBeCopiedError(),
        });
        return;
      }
      void copySelectedPanels(dashboardApi);
    };

    const onPaste = (event: ClipboardEvent) => {
      if (!isShortcutAvailable(event)) return;
      const raw = parsePanelJson(event.clipboardData?.getData('text/plain') ?? '');
      if (raw === undefined) return;
      event.preventDefault();
      void pastePanels(dashboardApi, raw);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [dashboardApi, enabled]);
};
