/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-publishing';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { MarkdownEmbeddableState } from '../server';
import { ADD_MARKDOWN_ACTION_ID } from './constants';
import type { MarkdownEditorApi } from './types';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';

export const createMarkdownAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_MARKDOWN_ACTION_ID,
  grouping: [ADD_PANEL_ANNOTATION_GROUP],
  order: 30,
  getIconType: () => 'visText',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const newMarkdownEmbeddable = await embeddable.addNewPanel<
      MarkdownEmbeddableState,
      MarkdownEditorApi
    >(
      {
        panelType: MARKDOWN_EMBEDDABLE_TYPE,
        serializedState: {
          content: '',
        },
      },
      { displaySuccessMessage: true }
    );
    return newMarkdownEmbeddable?.onEdit({ isNewPanel: true });
  },
  getDisplayName: () =>
    i18n.translate('dashboardMarkdown.displayNameAriaLabel', {
      defaultMessage: 'Markdown text',
    }),

  getDisplayNameTooltip: () =>
    i18n.translate('dashboardMarkdown.tooltip', {
      defaultMessage: 'Add custom text to dashboards.',
    }),
});
