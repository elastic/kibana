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

import {
  EuiIcon,
} from '@elastic/eui';

import { DashboardPanelAction } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../../dashboard_view_mode';

/**
 *
 * @return {DashboardPanelAction}
 */
export function getEditPanelAction() {
  return new DashboardPanelAction(
    {
      displayName: 'Edit visualization',
      id: 'editPanel',
      parentPanelId: 'mainMenu',
    },
    {
      icon: <EuiIcon type="pencil" />,
      onClick: ({ embeddable }) => { window.location = embeddable.metadata.editUrl; },
      isVisible: ({ containerState }) => (containerState.viewMode === DashboardViewMode.EDIT),
      isDisabled: ({ embeddable }) => (!embeddable || !embeddable.metadata || !embeddable.metadata.editUrl),
    });
}
