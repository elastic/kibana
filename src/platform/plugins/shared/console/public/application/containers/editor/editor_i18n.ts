/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const editorI18n = {
  clearConsoleInputButton: i18n.translate('console.editor.clearConsoleInputButton', {
    defaultMessage: 'Clear this input',
  }),
  clearConsoleOutputButton: i18n.translate('console.editor.clearConsoleOutputButton', {
    defaultMessage: 'Clear this output',
  }),
  adjustPanelSizeVertical: i18n.translate('console.editor.adjustPanelSizeAriaLabel', {
    defaultMessage: "Press up/down to adjust panels' sizes",
  }),
  adjustPanelSizeHorizontal: i18n.translate('console.editor.adjustPanelSizeAriaLabelHorizontal', {
    defaultMessage: "Press left/right to adjust panels' sizes",
  }),
};
