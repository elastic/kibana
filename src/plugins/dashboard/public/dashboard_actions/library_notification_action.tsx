/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { LibraryNotificationPopover } from './library_notification_popover';
import { unlinkActionIsCompatible, UnlinkFromLibraryAction } from './unlink_from_library_action';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export class LibraryNotificationAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!unlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return <LibraryNotificationPopover unlinkAction={this.unlinkAction} api={embeddable} />;
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return unlinkActionIsCompatible(embeddable);
  }

  public subscribeToCompatibilityChanges(
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: LibraryNotificationAction) => void
  ) {
    if (!unlinkActionIsCompatible(embeddable)) return;

    /**
     * TODO: Upgrade this action by subscribing to changes in the existance of a saved object id. Currently,
     *  this is unnecessary because a link or unlink operation will cause the panel to unmount and remount.
     */
    return embeddable.viewMode.subscribe((viewMode) => {
      embeddable.canUnlinkFromLibrary().then((canUnlink) => {
        onChange(viewMode === 'edit' && canUnlink, this);
      });
    });
  }

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!unlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardLibraryNotificationStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!unlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    if (!unlinkActionIsCompatible(embeddable)) return false;
    return embeddable.viewMode.value === 'edit' && embeddable.canUnlinkFromLibrary();
  };

  public execute = async () => {};
}
