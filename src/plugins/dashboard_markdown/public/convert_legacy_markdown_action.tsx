/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasUniqueId,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasParentApi,
  HasUniqueId,
  PublishesPanelDescription,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig, HasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import React from 'react';
import { MARKDOWN_ID } from './constants';
import { convertLegacyDashboardLinks } from './dashboard_links/dashboard_link_converter';

const CONVERT_LEGACY_MARKDOWN_ACTION_ID = 'CONVERT_LEGACY_MARKDOWN';

const displayName = i18n.translate('dashboardMarkdown.convertLegacyDisplayName', {
  defaultMessage: 'Convert to inline markdown',
});

const ActionMenuItem: React.FC = () => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>{displayName}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={'accent'}>
          {i18n.translate('visualizations.tonNavMenu.tryItBadgeText', {
            defaultMessage: 'Try it',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type ConvertLegacyMarkdownApi = HasUniqueId &
  HasVisualizeConfig &
  CanAccessViewMode &
  HasParentApi<PresentationContainer> &
  Partial<PublishesPanelTitle & PublishesPanelDescription>;

const compatibilityCheck = (api: unknown): api is ConvertLegacyMarkdownApi =>
  apiHasUniqueId(api) &&
  apiCanAccessViewMode(api) &&
  apiHasVisualizeConfig(api) &&
  apiHasParentApi(api) &&
  apiIsPresentationContainer(api.parentApi);

export const registerConvertLegacyMarkdownAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: CONVERT_LEGACY_MARKDOWN_ACTION_ID,
    getIconType: () => 'visText',
    showNotification: true,
    MenuItem: ActionMenuItem,
    isCompatible: async ({ embeddable }) => {
      if (!compatibilityCheck(embeddable) || getInheritedViewMode(embeddable) !== 'edit') {
        return false;
      }
      const vis = embeddable.getVis();
      return vis.type.name === 'markdown';
    },
    order: 49,
    execute: async ({ embeddable }) => {
      if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
      const legacyContent = embeddable.getVis().params.markdown;
      const content = convertLegacyDashboardLinks(legacyContent);

      embeddable.parentApi.replacePanel(embeddable.uuid, {
        panelType: MARKDOWN_ID,
        initialState: {
          content,
        },
      });
    },
    getDisplayName: () => 'Convert legacy markdown',
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, CONVERT_LEGACY_MARKDOWN_ACTION_ID);
};
