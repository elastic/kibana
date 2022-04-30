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
      i18n.translate('presentationUtil.controls.optionsList.summary.separator', {
        defaultMessage: ', ',
      }),
    getPlaceholder: () =>
      i18n.translate('presentationUtil.controls.optionsList.summary.placeholder', {
        defaultMessage: 'Select...',
      }),
  },
  editor: {
    getIndexPatternTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.editor.indexPatternTitle', {
        defaultMessage: 'Index pattern',
      }),
    getDataViewTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.editor.dataViewTitle', {
        defaultMessage: 'Data view',
      }),
    getNoDataViewTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.editor.noDataViewTitle', {
        defaultMessage: 'Select data view',
      }),
    getFieldTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.editor.fieldTitle', {
        defaultMessage: 'Field',
      }),
    getAllowMultiselectTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.editor.allowMultiselectTitle', {
        defaultMessage: 'Allow multiple selections in dropdown',
      }),
  },
  popover: {
    getLoadingMessage: () =>
      i18n.translate('presentationUtil.controls.optionsList.popover.loading', {
        defaultMessage: 'Loading filters',
      }),
    getEmptyMessage: () =>
      i18n.translate('presentationUtil.controls.optionsList.popover.empty', {
        defaultMessage: 'No filters found',
      }),
    getSelectionsEmptyMessage: () =>
      i18n.translate('presentationUtil.controls.optionsList.popover.selectionsEmpty', {
        defaultMessage: 'You have no selections',
      }),
    getAllOptionsButtonTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.popover.allOptionsTitle', {
        defaultMessage: 'Show all options',
      }),
    getSelectedOptionsButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.optionsList.popover.selectedOptionsTitle', {
        defaultMessage: 'Show only selected options',
      }),
    getClearAllSelectionsButtonTitle: () =>
      i18n.translate('presentationUtil.controls.optionsList.popover.clearAllSelectionsTitle', {
        defaultMessage: 'Clear selections',
      }),
  },
  errors: {
    getDataViewNotFoundError: (dataViewId: string) =>
      i18n.translate('presentationUtil.controls.optionsList.errors.dataViewNotFound', {
        defaultMessage: 'Could not locate data view: {dataViewId}',
        values: { dataViewId },
      }),
  },
};
