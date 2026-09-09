/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { openLazySystemFlyout } from '@kbn/presentation-util';
import { markdownClient } from '../markdown_client/markdown_client';
import { coreServices } from '../services/kibana_services';

const editFlyoutTitle = i18n.translate('dashboardMarkdown.libraryEditor.editFlyoutTitle', {
  defaultMessage: 'Edit markdown',
});

export const onVisualizationsEdit = (id: string) => {
  openLazySystemFlyout({
    core: coreServices,
    loadContent: async ({ closeFlyout }) => {
      const { data } = await markdownClient.get(id);
      const { MarkdownLibraryEditor } = await import('./markdown_library_editor');
      return React.createElement(MarkdownLibraryEditor, { id, initialState: data, closeFlyout });
    },
    flyoutProps: {
      'data-test-subj': 'markdownLibraryEditorFlyout',
      title: editFlyoutTitle,
    },
  });
};
