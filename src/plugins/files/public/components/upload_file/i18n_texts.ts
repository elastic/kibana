/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  defaultPickerLabel: i18n.translate('files.uploadFile.defaultFilePickerLabel', {
    defaultMessage: 'Upload a file',
  }),
  upload: i18n.translate('files.uploadFile.uploadButtonLabel', {
    defaultMessage: 'Upload',
  }),
  uploading: i18n.translate('files.uploadFile.uploadingButtonLabel', {
    defaultMessage: 'Uploading',
  }),
  uploadComplete: i18n.translate('files.uploadFile.uploadCompleteButtonLabel', {
    defaultMessage: 'Upload complete',
  }),
  retry: i18n.translate('files.uploadFile.retryButtonLabel', {
    defaultMessage: 'Retry',
  }),
  clear: i18n.translate('files.uploadFile.clearButtonLabel', {
    defaultMessage: 'Clear',
  }),
  cancel: i18n.translate('files.uploadFile.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  uploadDone: i18n.translate('files.uploadFile.uploadDoneToolTipContent', {
    defaultMessage: 'Your file was successfully uploaded!',
  }),
  fileTooLarge: (expectedSize: string) =>
    i18n.translate('files.uploadFile.fileTooLargeErrorMessage', {
      defaultMessage:
        'File is too large. Maximum size is {expectedSize, plural, one {# byte} other {# bytes} }.',
      values: { expectedSize },
    }),
};
