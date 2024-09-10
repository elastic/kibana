/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { LibraryNotificationPopover } from './library_notification_popover';
import {
  legacyUnlinkActionIsCompatible,
  LegacyUnlinkFromLibraryAction,
} from './legacy_unlink_from_library_action';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';

export const LEGACY_ACTION_LIBRARY_NOTIFICATION = 'LEGACY_ACTION_LIBRARY_NOTIFICATION';

export class LegacyLibraryNotificationAction implements Action<EmbeddableApiContext> {
  public readonly id = LEGACY_ACTION_LIBRARY_NOTIFICATION;
  public readonly type = LEGACY_ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: LegacyUnlinkFromLibraryAction) {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return <LibraryNotificationPopover unlinkAction={this.unlinkAction} api={embeddable} />;
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return legacyUnlinkActionIsCompatible(embeddable);
  }

  public subscribeToCompatibilityChanges(
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: LegacyLibraryNotificationAction) => void
  ) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) return;

    /**
     * TODO: Upgrade this action by subscribing to changes in the existance of a saved object id. Currently,
     *  this is unnecessary because a link or unlink operation will cause the panel to unmount and remount.
     */
    return getViewModeSubject(embeddable)?.subscribe((viewMode) => {
      embeddable.canUnlinkFromLibrary().then((canUnlink) => {
        onChange(viewMode === 'edit' && canUnlink, this);
      });
    });
  }

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardLibraryNotificationStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!legacyUnlinkActionIsCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    if (!legacyUnlinkActionIsCompatible(embeddable)) return false;
    return getInheritedViewMode(embeddable) === 'edit' && embeddable.canUnlinkFromLibrary();
  };

  public execute = async () => {};
}
