/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import {
  LegacyAddToLibraryAction,
  LegacyAddPanelToLibraryActionApi,
} from './legacy_add_to_library_action';
import { coreServices } from '../services/kibana_services';

describe('Add to library action', () => {
  let action: LegacyAddToLibraryAction;
  let context: { embeddable: LegacyAddPanelToLibraryActionApi };

  beforeEach(() => {
    action = new LegacyAddToLibraryAction();
    context = {
      embeddable: {
        linkToLibrary: jest.fn(),
        canLinkToLibrary: jest.fn().mockResolvedValue(true),
        unlinkFromLibrary: jest.fn(),
        canUnlinkFromLibrary: jest.fn().mockResolvedValue(true),

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

  it('is incompatible when canLinkToLibrary returns false', async () => {
    context.embeddable.canLinkToLibrary = jest.fn().mockResolvedValue(false);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the linkToLibrary method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.linkToLibrary).toHaveBeenCalled();
  });

  it('shows a toast with a title from the API when successful', async () => {
    await action.execute(context);
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      'data-test-subj': 'addPanelToLibrarySuccess',
      title: "Panel 'A very compatible API' was added to the library",
    });
  });

  it('shows a danger toast when the link operation is unsuccessful', async () => {
    context.embeddable.linkToLibrary = jest.fn().mockRejectedValue(new Error('Oh dang'));
    await action.execute(context);
    expect(coreServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
      'data-test-subj': 'addPanelToLibraryError',
      title: 'An error was encountered adding panel A very compatible API to the library',
    });
  });
});
