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
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '../../embeddable_plugin';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export interface LibraryNotificationActionContext {
  embeddable: IEmbeddable;
}

export class LibraryNotificationAction implements ActionByType<typeof ACTION_LIBRARY_NOTIFICATION> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  public getDisplayName({ embeddable }: LibraryNotificationActionContext) {
    return 'Library';
  }

  public getIconType({ embeddable }: LibraryNotificationActionContext) {
    return 'folderCheck';
  }

  public getDisplayNameTooltip = ({ embeddable }: LibraryNotificationActionContext) => {
    return i18n.translate('dashboard.panel.libraryNotification.toolTip', {
      defaultMessage:
        'This panel is linked to a Library item. Editing the panel might affect other dashboards.',
    });
  };

  public isCompatible = async ({ embeddable }: LibraryNotificationActionContext) => {
    return true;
  };

  public execute = async () => {};
}
