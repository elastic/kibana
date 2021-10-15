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
    getAllowMultiselectTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.editor.allowMultiselectTitle', {
        defaultMessage: 'Allow multiselect',
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
    getSelectionsEmptyMessage: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.selectionsEmpty', {
        defaultMessage: 'You have no selections',
      }),
    getAllOptionsButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.allOptionsTitle', {
        defaultMessage: 'Show all options',
      }),
    getSelectedOptionsButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.selectedOptionsTitle', {
        defaultMessage: 'Show selected options only',
      }),
    getClearAllSelectionsButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.clearAllSelectionsTitle', {
        defaultMessage: 'Clear selections',
      }),
  },
};
