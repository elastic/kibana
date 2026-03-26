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
  get consolePageHeading() {
    return i18n.translate('console.pageHeading', {
      defaultMessage: 'Console',
    });
  },
  get importButton() {
    return i18n.translate('console.importButtonLabel', {
      defaultMessage: 'Import requests',
    });
  },
  get importButtonTooltip() {
    return i18n.translate('console.importButtonTooltipLabel', {
      defaultMessage: 'Import requests from a file into the editor',
    });
  },
  get exportButton() {
    return i18n.translate('console.exportButton', {
      defaultMessage: 'Export requests',
    });
  },
  get exportButtonTooltip() {
    return i18n.translate('console.exportButtonTooltipLabel', {
      defaultMessage: 'Export all console requests to a TXT file',
    });
  },
  get helpButton() {
    return i18n.translate('console.helpButtonTooltipContent', {
      defaultMessage: 'Help',
    });
  },
  get shortcutsButton() {
    return i18n.translate('console.shortcutsButtonAriaLabel', {
      defaultMessage: 'Keyboard shortcuts',
    });
  },
  get variablesButton() {
    return i18n.translate('console.variablesButton', {
      defaultMessage: 'Variables',
    });
  },
  get openFullscrenButton() {
    return i18n.translate('console.openFullscreenButton', {
      defaultMessage: 'Open this console as a full page experience',
    });
  },
  get closeFullscrenButton() {
    return i18n.translate('console.closeFullscreenButton', {
      defaultMessage: 'Close full page experience',
    });
  },
};
