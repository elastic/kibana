/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Embeddable } from 'plugins/embeddable_api/embeddables';
import { ContextMenuAction, ViewMode } from '../../..';

export function getEditPanelAction() {
  return new ContextMenuAction(
    {
      displayName: i18n.translate('kbn.dashboard.panel.editPanel.displayName', {
        defaultMessage: 'Edit',
      }),
      id: 'editPanel',
      parentPanelId: 'mainMenu',
    },
    {
      priority: 9,
      icon: <EuiIcon type="pencil" />,
      isDisabled: ({ embeddable }: { embeddable: Embeddable }) => {
        const editUrl = embeddable.getOutput().editUrl;
        return !editUrl;
      },
      isVisible: ({ embeddable }: { embeddable: Embeddable }): boolean => {
        const canEditEmbeddable = Boolean(
          embeddable && embeddable.getOutput().editable && embeddable.getOutput().editUrl
        );
        const inDashboardEditMode = embeddable.getInput().viewMode === ViewMode.EDIT;
        return Boolean(canEditEmbeddable && inDashboardEditMode);
      },
      getHref: ({ embeddable }: { embeddable: Embeddable }): string => {
        const editUrl = embeddable ? embeddable.getOutput().editUrl : undefined;
        return editUrl ? editUrl : '';
      },
    }
  );
}
