/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const geti18nTexts = () => {
  return {
    closeButtonLabel: i18n.translate('indexPatternEditor.editor.flyoutCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
    saveButtonLabel: i18n.translate('indexPatternEditor.editor.flyoutSaveButtonLabel', {
      defaultMessage: 'Create index pattern',
    }),
    noTimestampOptionText: i18n.translate(
      'indexPatternEditor.createIndexPattern.stepTime.noTimeFieldsLabel',
      {
        defaultMessage: "The matching data sources don't have time fields.",
      }
    ),
    allowHiddenAriaLabel: i18n.translate('indexPatternEditor.form.allowHiddenAriaLabel', {
      defaultMessage: 'Allow hidden and system indices',
    }),
    customIndexPatternIdLabel: i18n.translate('indexPatternEditor.form.customIndexPatternIdLabel', {
      defaultMessage: 'Custom index pattern ID',
    }),
    timestampFieldHelp: i18n.translate('indexPatternEditor.editor.form.timeFieldHelp', {
      defaultMessage: 'Select a primary time field for use with the global time filter.',
    }),
    rollupLabel: i18n.translate('indexPatternEditor.rollupIndexPattern.createIndex.indexLabel', {
      defaultMessage: 'Rollup',
    }),
  };
};
