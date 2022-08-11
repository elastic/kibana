/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const TimeSliderStrings = {
  getDisplayName: () =>
    i18n.translate('controls.timeSlider.displayName', {
      defaultMessage: 'Time slider',
    }),
  getDescription: () =>
    i18n.translate('controls.timeSlider.description', {
      defaultMessage: 'Add a slider for selecting a time range',
    }),
  editor: {
    getDataViewTitle: () =>
      i18n.translate('controls.timeSlider.editor.dataViewTitle', {
        defaultMessage: 'Data view',
      }),
    getNoDataViewTitle: () =>
      i18n.translate('controls.timeSlider.editor.noDataViewTitle', {
        defaultMessage: 'Select data view',
      }),
    getFieldTitle: () =>
      i18n.translate('controls.timeSlider.editor.fieldTitle', {
        defaultMessage: 'Field',
      }),
  },
  resetButton: {
    getLabel: () =>
      i18n.translate('controls.timeSlider.resetButton.label', {
        defaultMessage: 'Reset selections',
      }),
  },
  noDocumentsPopover: {
    getLabel: () =>
      i18n.translate('controls.timeSlider.noDocuments.label', {
        defaultMessage: 'There were no documents found.  Range selection unavailable.',
      }),
  },
};
