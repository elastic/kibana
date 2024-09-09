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
  apiHasInPlaceLibraryTransforms,
  EmbeddableApiContext,
  getInheritedViewMode,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { LibraryNotificationPopover } from './library_notification_popover';
import { isApiCompatible, UnlinkFromLibraryAction } from './unlink_from_library_action';
import { dashboardLibraryNotificationStrings } from './_dashboard_actions_strings';

export const ACTION_LIBRARY_NOTIFICATION = 'ACTION_LIBRARY_NOTIFICATION';

export class LibraryNotificationAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_LIBRARY_NOTIFICATION;
  public readonly type = ACTION_LIBRARY_NOTIFICATION;
  public readonly order = 1;

  constructor(private unlinkAction: UnlinkFromLibraryAction) {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return <LibraryNotificationPopover unlinkAction={this.unlinkAction} api={embeddable} />;
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public subscribeToCompatibilityChanges = (
    { embeddable }: EmbeddableApiContext,
    onChange: (isCompatible: boolean, action: LibraryNotificationAction) => void
  ) => {
    if (!isApiCompatible(embeddable)) return;
    const libraryIdSubject = apiHasInPlaceLibraryTransforms(embeddable)
      ? embeddable.libraryId$
      : new BehaviorSubject<string | undefined>(undefined);
    const viewModeSubject = getViewModeSubject(embeddable);
    if (!viewModeSubject) throw new IncompatibleActionError();

    /**
     * TODO: Upgrade this action by subscribing to changes in the existance of a saved object id. Currently,
     *  this is unnecessary because a link or unlink operation will cause the panel to unmount and remount.
     */
    return combineLatest([libraryIdSubject, viewModeSubject]).subscribe(([libraryId, viewMode]) => {
      this.unlinkAction.canUnlinkFromLibrary(embeddable).then((canUnlink) => {
        onChange(viewMode === 'edit' && canUnlink, this);
      });
    });
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return dashboardLibraryNotificationStrings.getDisplayName();
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return 'folderCheck';
  }

  public isCompatible = async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) return false;
    return (
      getInheritedViewMode(embeddable) === 'edit' &&
      this.unlinkAction.canUnlinkFromLibrary(embeddable)
    );
  };

  public execute = async () => {};
}
