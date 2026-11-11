/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const panelJsonStrings = {
  getNotAPanelError: () =>
    i18n.translate('dashboard.panelJson.notAPanelError', {
      defaultMessage:
        'The JSON doesn’t describe a dashboard panel. Use the JSON from the Export JSON option of a panel, which includes the panel "type" and its "config".',
    }),
  getNoPanelsError: () =>
    i18n.translate('dashboard.panelJson.noPanelsError', {
      defaultMessage: 'The JSON doesn’t contain any panels.',
    }),
  getTooManyPanelsError: (count: number, maxPanels: number) =>
    i18n.translate('dashboard.panelJson.tooManyPanelsError', {
      defaultMessage:
        'The JSON contains {count} panels. You can add up to {maxPanels} panels at a time.',
      values: { count, maxPanels },
    }),
  getPanelTypeNotAvailableError: (type: string) =>
    i18n.translate('dashboard.panelJson.panelTypeNotAvailableError', {
      defaultMessage: 'Panels of type "{type}" aren’t available in this deployment.',
      values: { type },
    }),
  getPanelNotSupportedError: (reason?: string) =>
    reason
      ? i18n.translate('dashboard.panelJson.panelNotSupportedWithReasonError', {
          defaultMessage: 'This panel can’t be added: {reason}',
          values: { reason },
        })
      : i18n.translate('dashboard.panelJson.panelNotSupportedError', {
          defaultMessage: 'This panel can’t be added.',
        }),
  getTabDescription: () =>
    i18n.translate('dashboard.panelJson.tabDescription', {
      defaultMessage:
        'Use the JSON from Export JSON, available in a panel’s menu and when you select several panels.',
    }),
  getEditorLabel: () =>
    i18n.translate('dashboard.panelJson.editorLabel', {
      defaultMessage: 'Panel JSON',
    }),
  getAddButtonLabel: (count: number) =>
    i18n.translate('dashboard.panelJson.addButtonLabel', {
      defaultMessage: '{count, plural, one {Add panel} other {Add # panels}}',
      values: { count },
    }),
  getPanelsAddedSuccess: (count: number) =>
    i18n.translate('dashboard.panelJson.panelsAddedSuccess', {
      defaultMessage: '{count} panels were added',
      values: { count },
    }),
  getPanelsCopiedSuccess: (count: number) =>
    i18n.translate('dashboard.panelJson.panelsCopiedSuccess', {
      defaultMessage: '{count, plural, one {Panel copied} other {# panels copied}}',
      values: { count },
    }),
  getPanelsNotCopiedHeading: (count: number) =>
    i18n.translate('dashboard.panelJson.panelsNotCopiedHeading', {
      defaultMessage:
        '{count, plural, one {This panel can’t be copied:} other {These panels can’t be copied:}}',
      values: { count },
    }),
  getNoPanelsCanBeCopiedError: () =>
    i18n.translate('dashboard.panelJson.noPanelsCanBeCopiedError', {
      defaultMessage: 'None of the selected panels can be copied.',
    }),
  getCopyPanelsErrorTitle: () =>
    i18n.translate('dashboard.panelJson.copyPanelsErrorTitle', {
      defaultMessage: 'Unable to copy the panels',
    }),
  getCancelButtonLabel: () =>
    i18n.translate('dashboard.panelJson.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getEmptyInputStatus: () =>
    i18n.translate('dashboard.panelJson.emptyInputStatus', {
      defaultMessage: 'Add JSON to continue',
    }),
  getValidatingStatus: () =>
    i18n.translate('dashboard.panelJson.validatingStatus', {
      defaultMessage: 'Checking JSON…',
    }),
  getFixErrorsStatus: () =>
    i18n.translate('dashboard.panelJson.fixErrorsStatus', {
      defaultMessage: 'Fix the JSON to continue',
    }),
  getAddPanelErrorTitle: () =>
    i18n.translate('dashboard.panelJson.addPanelErrorTitle', {
      defaultMessage: 'Unable to add the panel',
    }),
  getServerValidationErrorTitle: () =>
    i18n.translate('dashboard.panelJson.serverValidationErrorTitle', {
      defaultMessage: 'The panel could not be validated.',
    }),
  getServerValidationErrorText: () =>
    i18n.translate('dashboard.panelJson.serverValidationErrorText', {
      defaultMessage: 'Make sure the JSON comes from the Export JSON option of a panel.',
    }),
  getWarningsSummary: (count: number) =>
    i18n.translate('dashboard.panelJson.warningsSummary', {
      defaultMessage: '{count} item{count, plural, one {} other {s}} removed from the panel.',
      values: { count },
    }),
  getMissingDataViewsSummary: (count: number) =>
    i18n.translate('dashboard.panelJson.missingDataViewsSummary', {
      defaultMessage:
        'This panel uses {count, plural, one {a data view that doesn’t} other {# data views that don’t}} exist in this space. The panel shows an error until you create {count, plural, one {it} other {them}} or edit the panel.',
      values: { count },
    }),
};
