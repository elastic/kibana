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
import { ClonePanelAction, ClonePanelActionApi } from './clone_panel_action';

describe('Clone panel action', () => {
  let action: ClonePanelAction;
  let context: { embeddable: ClonePanelActionApi };

  beforeEach(() => {
    action = new ClonePanelAction();
    context = {
      embeddable: {
        uuid: 'superId',
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        parentApi: {
          duplicatePanel: jest.fn(),
        },
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

  it('calls the parent duplicatePanel method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.parentApi.duplicatePanel).toHaveBeenCalled();
  });
});
