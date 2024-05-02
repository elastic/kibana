/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { pluginServices } from '../services/plugin_services';
import {
  LegacyUnlinkFromLibraryAction,
  LegacyUnlinkPanelFromLibraryActionApi,
} from './legacy_unlink_from_library_action';

describe('Unlink from library action', () => {
  let action: LegacyUnlinkFromLibraryAction;
  let context: { embeddable: LegacyUnlinkPanelFromLibraryActionApi };

  beforeEach(() => {
    action = new LegacyUnlinkFromLibraryAction();
    context = {
      embeddable: {
        unlinkFromLibrary: jest.fn(),
        canUnlinkFromLibrary: jest.fn().mockResolvedValue(true),
        linkToLibrary: jest.fn(),
        canLinkToLibrary: jest.fn().mockResolvedValue(true),
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        panelTitle: new BehaviorSubject<string | undefined>('A very compatible API'),
      },
    };
  });

  it('is compatible when api meets all conditions', async () => {
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when context lacks necessary functions', async () => {
    const emptyContext = {
      embeddable: {},
    };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('is incompatible when view mode is view', async () => {
    (context.embeddable as PublishesViewMode).viewMode = new BehaviorSubject<ViewMode>('view');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when canUnlinkFromLibrary returns false', async () => {
    context.embeddable.canUnlinkFromLibrary = jest.fn().mockResolvedValue(false);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the unlinkFromLibrary method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.unlinkFromLibrary).toHaveBeenCalled();
  });

  it('shows a toast with a title from the API when successful', async () => {
    await action.execute(context);
    expect(pluginServices.getServices().notifications.toasts.addSuccess).toHaveBeenCalledWith({
      'data-test-subj': 'unlinkPanelSuccess',
      title: "Panel 'A very compatible API' is no longer connected to the library.",
    });
  });

  it('shows a danger toast when the link operation is unsuccessful', async () => {
    context.embeddable.unlinkFromLibrary = jest.fn().mockRejectedValue(new Error('Oh dang'));
    await action.execute(context);
    expect(pluginServices.getServices().notifications.toasts.addDanger).toHaveBeenCalledWith({
      'data-test-subj': 'unlinkPanelFailure',
      title: "An error occured while unlinking 'A very compatible API' from the library.",
    });
  });
});
