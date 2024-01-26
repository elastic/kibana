/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { RemovePanelAction, RemovePanelActionApi } from './remove_panel_action';

describe('Remove panel action', () => {
  let action: RemovePanelAction;
  let context: { embeddable: RemovePanelActionApi };

  beforeEach(() => {
    action = new RemovePanelAction();
    context = {
      embeddable: {
        uuid: 'superId',
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        parentApi: {
          removePanel: jest.fn(),
          canRemovePanels: jest.fn().mockReturnValue(true),
          replacePanel: jest.fn(),
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
    context.embeddable.viewMode = new BehaviorSubject<ViewMode>('view');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the parent removePanel method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.parentApi.removePanel).toHaveBeenCalled();
  });
});
