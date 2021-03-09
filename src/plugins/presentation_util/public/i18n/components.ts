/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ComponentStrings = {
  PanelToolbar: {
    getEditorMenuButtonLabel: () =>
      i18n.translate('presentationUtil.panelToolbar.editorMenuButtonLabel', {
        defaultMessage: 'All editors',
      }),
    getLibraryButtonLabel: () =>
      i18n.translate('presentationUtil.panelToolbar.libraryButtonLabel', {
        defaultMessage: 'Add from library',
      }),
  },
};
