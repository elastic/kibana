/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const OptionsListStrings = {
  summary: {
    getSeparator: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.summary.separator', {
        defaultMessage: ', ',
      }),
    getPlaceholder: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.summary.placeholder', {
        defaultMessage: 'Select...',
      }),
  },
  editor: {
    getIndexPatternTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.editor.indexPatternTitle', {
        defaultMessage: 'Index pattern',
      }),
    getFieldTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.editor.fieldTitle', {
        defaultMessage: 'Field',
      }),
  },
  popover: {
    getLoadingMessage: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.loading', {
        defaultMessage: 'Loading filters',
      }),
    getEmptyMessage: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.empty', {
        defaultMessage: 'No filters found',
      }),
  },
};
