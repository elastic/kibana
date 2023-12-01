/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CanDuplicatePanels } from '@kbn/presentation-containers';
import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ClonePanelAction, ClonePanelActionApi } from './clone_panel_action';

describe('Clone panel action', () => {
  let action: ClonePanelAction;
  let context: { embeddable: ClonePanelActionApi };

  beforeEach(() => {
    action = new ClonePanelAction();
    context = {
      embeddable: {
        uuid: new BehaviorSubject<string>('superId'),
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        parentApi: new BehaviorSubject<CanDuplicatePanels>({
          duplicatePanel: jest.fn(),
        }),
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
    context.embeddable.viewMode = new BehaviorSubject<ViewMode>('view');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the parent duplicatePanel method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.parentApi.value.duplicatePanel).toHaveBeenCalled();
  });
});
