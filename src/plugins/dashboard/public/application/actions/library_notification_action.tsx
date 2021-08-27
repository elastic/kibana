/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ViewMode } from '../../../../embeddable/common/types';
import { isErrorEmbeddable } from '../../../../embeddable/public/lib/embeddables/error_embeddable';
import type { IEmbeddable } from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import { isReferenceOrValueEmbeddable } from '../../../../embeddable/public/lib/reference_or_value_embeddable/types';
import { reactToUiComponent } from '../../../../kibana_react/public/adapters/react_to_ui_component';
import type { Action } from '../../../../ui_actions/public/actions/action';
import { IncompatibleActionError } from '../../../../ui_actions/public/actions/incompatible_action_error';
import { dashboardLibraryNotification } from '../../dashboard_strings';
import { LibraryNotificationPopover } from './library_notification_popover';
import { UnlinkFromLibraryAction } from './unlink_from_library_action';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export interface LibraryNotificationActionContext {
  embeddable: IEmbeddable;
}

export class LibraryNotificationAction implements Action<LibraryNotificationActionContext> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {}

  private displayName = dashboardLibraryNotification.getDisplayName();

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
