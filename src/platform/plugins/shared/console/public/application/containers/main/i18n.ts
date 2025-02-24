/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const MAIN_PANEL_LABELS = {
  consolePageHeading: i18n.translate('console.pageHeading', {
    defaultMessage: 'Console',
  }),
  importButton: i18n.translate('console.importButtonLabel', {
    defaultMessage: 'Import requests',
  }),
  importButtonTooltip: i18n.translate('console.importButtonTooltipLabel', {
    defaultMessage: 'Import requests from a file into the editor',
  }),
  exportButton: i18n.translate('console.exportButton', {
    defaultMessage: 'Export requests',
  }),
  exportButtonTooltip: i18n.translate('console.exportButtonTooltipLabel', {
    defaultMessage: 'Export all console requests to a TXT file',
  }),
  helpButton: i18n.translate('console.helpButtonTooltipContent', {
    defaultMessage: 'Help',
  }),
  shortcutsButton: i18n.translate('console.shortcutsButtonAriaLabel', {
    defaultMessage: 'Keyboard shortcuts',
  }),
  variablesButton: i18n.translate('console.variablesButton', {
    defaultMessage: 'Variables',
  }),
  openFullscrenButton: i18n.translate('console.openFullscreenButton', {
    defaultMessage: 'Open this console as a full page experience',
  }),
  closeFullscrenButton: i18n.translate('console.closeFullscreenButton', {
    defaultMessage: 'Close full page experience',
  }),
};
