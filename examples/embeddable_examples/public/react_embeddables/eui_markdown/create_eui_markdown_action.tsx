/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_EUI_MARKDOWN_ACTION_ID, EUI_MARKDOWN_ID } from './constants';
import { MarkdownEditorSerializedState } from './types';

// -----------------------------------------------------------------------------
// Create an action which allows this embeddable to be created from the dashboard toolbar context menu.
// -----------------------------------------------------------------------------
export const createEuiMarkdownAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_EUI_MARKDOWN_ACTION_ID,
  grouping: [embeddableExamplesGrouping],
  getIconType: () => 'editorCodeBlock',
  isCompatible: async ({ embeddable }) => {
    return apiCanAddNewPanel(embeddable);
  },
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel<MarkdownEditorSerializedState>(
      {
        panelType: EUI_MARKDOWN_ID,
        serializedState: { rawState: { content: '# hello world!' } },
      },
      true
    );
  },
  getDisplayName: () =>
    i18n.translate('embeddableExamples.euiMarkdownEditor.displayNameAriaLabel', {
      defaultMessage: 'EUI Markdown',
    }),
});
