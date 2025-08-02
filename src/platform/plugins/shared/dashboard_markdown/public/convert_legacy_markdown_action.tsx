/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
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
  PublishesDescription,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig, HasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import { CONVERT_LEGACY_MARKDOWN_ACTION_ID, MARKDOWN_ID } from './constants';

const displayName = i18n.translate('dashboardMarkdown.convertLegacyDisplayName', {
  defaultMessage: 'Convert to new markdown',
});

const ActionMenuItem: React.FC = () => {
  return (
    <EuiToolTip
      content={i18n.translate('dashboardMarkdown.convertLegacyDisplayName', {
        defaultMessage:
          'Legacy markdown can’t be edited. Convert to the new markdown for easier editing and better styling.',
      })}
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>{displayName}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

type ConvertLegacyMarkdownApi = HasUniqueId &
  CanAccessViewMode &
  HasVisualizeConfig &
  HasParentApi<PresentationContainer> &
  Partial<PublishesTitle & PublishesDescription>;

const compatibilityCheck = (api: unknown): api is ConvertLegacyMarkdownApi =>
  apiHasUniqueId(api) &&
  apiCanAccessViewMode(api) &&
  apiHasVisualizeConfig(api) &&
  apiHasParentApi(api) &&
  apiIsPresentationContainer(api.parentApi);

export const getConvertLegacyMarkdownAction = () => ({
  id: CONVERT_LEGACY_MARKDOWN_ACTION_ID,
  getIconType: () => 'merge',
  showNotification: true,
  MenuItem: ActionMenuItem,
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    if (!compatibilityCheck(embeddable) || getInheritedViewMode(embeddable) !== 'edit') {
      return false;
    }
    const vis = embeddable.getVis();
    return vis.type.name === 'markdown';
  },
  order: 49,
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
    const legacyContent = embeddable.getVis().params.markdown;

    await embeddable.parentApi.replacePanel(embeddable.uuid, {
      panelType: MARKDOWN_ID,
      serializedState: {
        rawState: {
          content: legacyContent,
        },
      },
    });
  },
  getDisplayName: () => 'Convert to new markdown',
});
