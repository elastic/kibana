/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { BehaviorSubject } from 'rxjs';
import { ReplacePanelSOFinder } from '.';
import { ReplacePanelAction, ReplacePanelActionApi } from './replace_panel_action';

const mockOpenReplacePanelFlyout = jest.fn();
jest.mock('./open_replace_panel_flyout', () => ({
  openReplacePanelFlyout: () => mockOpenReplacePanelFlyout(),
}));

describe('replace panel action', () => {
  let action: ReplacePanelAction;
  let context: { embeddable: ReplacePanelActionApi };

  const savedObjectFinder = {} as unknown as ReplacePanelSOFinder;

  beforeEach(() => {
    action = new ReplacePanelAction(savedObjectFinder);
    context = {
      embeddable: {
        uuid: 'superId',
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        parentApi: getMockPresentationContainer(),
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

  it('calls open replace panel flyout on execute', async () => {
    action.execute(context);
    expect(mockOpenReplacePanelFlyout).toHaveBeenCalled();
  });
});
