/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const MAIN_PANEL_LABELS = {
  consolePageHeading: i18n.translate('console.pageHeading', {
    defaultMessage: 'Console',
  }),
  importExportButton: i18n.translate('console.importExportButtonLabel', {
    defaultMessage: 'Import/Export',
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
