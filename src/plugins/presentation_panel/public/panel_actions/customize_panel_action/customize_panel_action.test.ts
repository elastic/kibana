/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { TracksOverlays } from '@kbn/presentation-containers';
import { PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';

import { BehaviorSubject } from 'rxjs';
import { core } from '../../kibana_services';
import { CustomizePanelAction, CustomizePanelActionApi } from './customize_panel_action';

describe('Customize panel action', () => {
  let action: CustomizePanelAction;
  let context: { embeddable: CustomizePanelActionApi };

  beforeEach(() => {
    action = new CustomizePanelAction();
    context = {
      embeddable: {
        parentApi: {},
        viewMode: new BehaviorSubject<ViewMode>('edit'),
        dataViews: new BehaviorSubject<DataView[] | undefined>(undefined),
      },
    };
  });

  it('is compatible in edit mode', async () => {
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is compatible in view mode when API exposes writable unified search', async () => {
    (context.embeddable as PublishesViewMode).viewMode = new BehaviorSubject<ViewMode>('view');
    context.embeddable.timeRange$ = new BehaviorSubject<TimeRange | undefined>({
      from: 'now-15m',
      to: 'now',
    });
    context.embeddable.filters$ = new BehaviorSubject<Filter[] | undefined>([]);
    context.embeddable.query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when context lacks necessary functions', async () => {
    const emptyContext = {
      embeddable: {},
    };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('opens a flyout on execute', async () => {
    core.overlays.openFlyout = jest.fn();
    await action.execute(context);
    expect(core.overlays.openFlyout).toHaveBeenCalled();
  });

  it('opens overlay on parent if parent is an overlay tracker', async () => {
    context.embeddable.parentApi = {
      openOverlay: jest.fn(),
      timeRange$: undefined,
      clearOverlays: jest.fn(),
    };
    await action.execute(context);
    expect((context.embeddable.parentApi as TracksOverlays).openOverlay).toHaveBeenCalled();
  });
});
