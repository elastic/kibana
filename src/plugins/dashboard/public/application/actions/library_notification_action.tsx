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

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  IEmbeddable,
  ViewMode,
  isReferenceOrValueEmbeddable,
  isErrorEmbeddable,
} from '../../embeddable_plugin';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { reactToUiComponent } from '../../../../kibana_react/public';
import { UnlinkFromLibraryAction } from '.';
import { LibraryNotificationPopover } from './library_notification_popover';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export interface LibraryNotificationActionContext {
  embeddable: IEmbeddable;
}

export class LibraryNotificationAction implements ActionByType<typeof ACTION_LIBRARY_NOTIFICATION> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {}

  private displayName = i18n.translate('dashboard.panel.LibraryNotification', {
    defaultMessage: 'Visualize Library',
  });

  private icon = 'folderCheck';

  private LibraryNotification: React.FC<{ context: LibraryNotificationActionContext }> = ({
    context,
  }: {
    context: LibraryNotificationActionContext;
  }) => {
    const { embeddable } = context;
    return (
      <LibraryNotificationPopover
        unlinkAction={this.unlinkAction}
        displayName={this.displayName}
        context={context}
        icon={this.getIconType({ embeddable })}
        id={this.id}
      />
    );
  };

  public readonly MenuItem = reactToUiComponent(this.LibraryNotification);

  public getDisplayName({ embeddable }: LibraryNotificationActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return this.displayName;
  }

  public getIconType({ embeddable }: LibraryNotificationActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return this.icon;
  }

  public isCompatible = async ({ embeddable }: LibraryNotificationActionContext) => {
    return (
      !isErrorEmbeddable(embeddable) &&
      embeddable.getRoot().isContainer &&
      embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
      isReferenceOrValueEmbeddable(embeddable) &&
      embeddable.inputIsRefType(embeddable.getInput())
    );
  };

  public execute = async () => {};
}
