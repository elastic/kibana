/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/presentation-publishing';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { LibraryNotificationAction } from './library_notification_action';
import {
  UnlinkFromLibraryAction,
  UnlinkPanelFromLibraryActionApi,
} from './unlink_from_library_action';

describe('library notification action', () => {
  let action: LibraryNotificationAction;
  let unlinkAction: UnlinkFromLibraryAction;
  let context: { embeddable: UnlinkPanelFromLibraryActionApi };

  let updateViewMode: (viewMode: ViewMode) => void;

  beforeEach(() => {
    const viewModeSubject = new BehaviorSubject<ViewMode>('edit');
    updateViewMode = (viewMode) => viewModeSubject.next(viewMode);

    unlinkAction = new UnlinkFromLibraryAction();
    action = new LibraryNotificationAction(unlinkAction);
    context = {
      embeddable: {
        viewMode: viewModeSubject,
        canUnlinkFromLibrary: jest.fn().mockResolvedValue(true),
        unlinkFromLibrary: jest.fn(),
      },
    };
  });

  it('is compatible when api meets all conditions', async () => {
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when api is missing required functions', async () => {
    const emptyContext = { embeddable: {} };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('is incompatible when can unlink from library resolves to false', async () => {
    context.embeddable.canUnlinkFromLibrary = jest.fn().mockResolvedValue(false);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls onChange when view mode changes', async () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateViewMode('view');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false, action));
  });
});
