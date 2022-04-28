/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const RangeSliderStrings = {
  getDisplayName: () =>
    i18n.translate('controls.rangeSlider.displayName', {
      defaultMessage: 'Range slider',
    }),
  getDescription: () =>
    i18n.translate('controls.rangeSlider.description', {
      defaultMessage: 'Add a control for selecting a range of field values.',
    }),
  editor: {
    getDataViewTitle: () =>
      i18n.translate('controls.rangeSlider.editor.dataViewTitle', {
        defaultMessage: 'Data view',
      }),
    getNoDataViewTitle: () =>
      i18n.translate('controls.rangeSlider.editor.noDataViewTitle', {
        defaultMessage: 'Select data view',
      }),
    getFieldTitle: () =>
      i18n.translate('controls.rangeSlider.editor.fieldTitle', {
        defaultMessage: 'Field',
      }),
  },
  popover: {
    getAllOptionsButtonTitle: () =>
      i18n.translate('controls.rangeSlider.popover.allOptionsTitle', {
        defaultMessage: 'Show all options',
      }),
    getClearRangeButtonTitle: () =>
      i18n.translate('controls.rangeSlider.popover.clearRangeTitle', {
        defaultMessage: 'Clear range',
      }),
    getNoDataHelpText: () =>
      i18n.translate('controls.rangeSlider.popover.noDataHelpText', {
        defaultMessage: 'Selected range is outside of available data. No filter was applied.',
      }),
  },
  errors: {
    getDataViewNotFoundError: (dataViewId: string) =>
      i18n.translate('controls.optionsList.errors.dataViewNotFound', {
        defaultMessage: 'Could not locate data view: {dataViewId}',
        values: { dataViewId },
      }),
    getUpperLessThanLowerErrorMessage: () =>
      i18n.translate('controls.rangeSlider.popover.upperLessThanLowerErrorMessage', {
        defaultMessage: 'The upper bound must be greater than or equal to the lower bound.',
      }),
  },
};
