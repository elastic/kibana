/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  ViewMode,
  type IEmbeddable,
  isErrorEmbeddable,
  isReferenceOrValueEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { pluginServices } from '../services/plugin_services';
import { UnlinkFromLibraryAction } from './unlink_from_library_action';
import { LibraryNotificationPopover } from './library_notification_popover';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export interface LibraryNotificationActionContext {
  embeddable: IEmbeddable;
}

export class LibraryNotificationAction implements Action<LibraryNotificationActionContext> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  private theme$;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {
    ({
      settings: {
        theme: { theme$: this.theme$ },
      },
    } = pluginServices.getServices());
  }

  private displayName = dashboardLibraryNotificationStrings.getDisplayName();

  private icon = 'folderCheck';

  public readonly MenuItem = ({ context }: { context: LibraryNotificationActionContext }) => {
    const { embeddable } = context;
    return (
      <KibanaThemeProvider theme$={this.theme$}>
        <LibraryNotificationPopover
          unlinkAction={this.unlinkAction}
          displayName={this.displayName}
          context={context}
          icon={this.getIconType({ embeddable })}
          id={this.id}
        />
      </KibanaThemeProvider>
    );
  };

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
