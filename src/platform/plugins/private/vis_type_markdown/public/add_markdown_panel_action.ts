/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableApiContext, apiHasAppContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import { MarkdownStartDependencies } from './plugin';

export function getAddMarkdownPanelAction(deps: MarkdownStartDependencies) {
  return {
    id: 'addMarkdownPanelAction',
    getIconType: () =>  'visText',
    order: 30,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const stateTransferService = deps.embeddable.getStateTransfer();
      stateTransferService.navigateToEditor('visualize', {
        path: '#/create?type=markdown',
        state: {
          originatingApp: apiHasAppContext(embeddable) ? embeddable.getAppContext().currentAppId : '',
          originatingPath:  apiHasAppContext(embeddable) ? embeddable.getAppContext().getCurrentPath?.() : undefined,
          searchSessionId: deps.data.search.session.getSessionId(),
        },
      });
    },
    grouping: [ADD_PANEL_ANNOTATION_GROUP],
    getDisplayName: () =>
      i18n.translate('visTypeMarkdown.markdownTitleInWizard', {
        defaultMessage: 'Markdown text',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('visTypeMarkdown.markdownDescription', {
        defaultMessage: 'Add custom text or images to dashboards.',
      })
  };
};
