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
import { ShowConfigPanelAction, ShowConfigPanelActionApi } from './show_config_panel_action';

describe('Show config panel action', () => {
  let action: ShowConfigPanelAction;
  let context: { embeddable: ShowConfigPanelActionApi };
  let updateViewMode: (viewMode: ViewMode) => void;

  beforeEach(() => {
    const viewModeSubject = new BehaviorSubject<ViewMode>('view');
    updateViewMode = (viewMode) => viewModeSubject.next(viewMode);

    action = new ShowConfigPanelAction();
    context = {
      embeddable: {
        viewMode: viewModeSubject,
        onShowConfig: jest.fn(),
        isReadOnlyEnabled: jest.fn().mockReturnValue(true),
        getTypeDisplayName: jest.fn().mockReturnValue('A very fun panel type'),
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

  it('is incompatible when view mode is edit', async () => {
    (context.embeddable as PublishesViewMode).viewMode = new BehaviorSubject<ViewMode>('edit');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when view is not enabled', async () => {
    context.embeddable.isReadOnlyEnabled = jest.fn().mockReturnValue(false);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the onShowConfig method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.onShowConfig).toHaveBeenCalled();
  });

  it('calls onChange when view mode changes', () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateViewMode('edit');
    expect(onChange).toHaveBeenCalledWith(false, action);
  });
});
