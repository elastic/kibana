/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  title: i18n.translate('files.filePicker.title', {
    defaultMessage: 'Select a file',
  }),
  titleMultiple: i18n.translate('files.filePicker.titleMultiple', {
    defaultMessage: 'Select files',
  }),
  loadingFilesErrorTitle: i18n.translate('files.filePicker.error.loadingTitle', {
    defaultMessage: 'Could not load files',
  }),
  retryButtonLabel: i18n.translate('files.filePicker.error.retryButtonLabel', {
    defaultMessage: 'Retry',
  }),
  emptyStatePrompt: i18n.translate('files.filePicker.emptyStatePromptTitle', {
    defaultMessage: 'Upload your first file',
  }),
  selectFileLabel: i18n.translate('files.filePicker.selectFileButtonLable', {
    defaultMessage: 'Select file',
  }),
  selectFilesLabel: (nrOfFiles: number) =>
    i18n.translate('files.filePicker.selectFilesButtonLable', {
      defaultMessage: 'Select {nrOfFiles} files',
      values: { nrOfFiles },
    }),
  searchFieldPlaceholder: i18n.translate('files.filePicker.searchFieldPlaceholder', {
    defaultMessage: 'my-file-*',
  }),
  emptyFileGridPrompt: i18n.translate('files.filePicker.emptyGridPrompt', {
    defaultMessage: 'No files match your filter',
  }),
  loadMoreButtonLabel: i18n.translate('files.filePicker.loadMoreButtonLabel', {
    defaultMessage: 'Load more',
  }),
  clearFilterButton: i18n.translate('files.filePicker.clearFilterButtonLabel', {
    defaultMessage: 'Clear filter',
  }),
  uploadFilePlaceholderText: i18n.translate('files.filePicker.uploadFilePlaceholderText', {
    defaultMessage: 'Drag and drop to upload new files',
  }),
};
