/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ComponentStrings = {
  SolutionToolbar: {
    getEditorMenuButtonLabel: () =>
      i18n.translate('presentationUtil.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'All editors',
      }),
    getLibraryButtonLabel: () =>
      i18n.translate('presentationUtil.solutionToolbar.libraryButtonLabel', {
        defaultMessage: 'Add from library',
      }),
  },
  QuickButtonGroup: {
    getAriaButtonLabel: (createType: string) =>
      i18n.translate('presentationUtil.solutionToolbar.quickButton.ariaButtonLabel', {
        defaultMessage: `Create new {createType}`,
        values: {
          createType,
        },
      }),
    getLegend: () =>
      i18n.translate('presentationUtil.solutionToolbar.quickButton.legendLabel', {
        defaultMessage: 'Quick create',
      }),
  },
};
