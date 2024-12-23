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
import { EditPanelAction, EditPanelActionApi } from './edit_panel_action';

describe('Edit panel action', () => {
  let action: EditPanelAction;
  let context: { embeddable: EditPanelActionApi };
  let updateViewMode: (viewMode: ViewMode) => void;

  beforeEach(() => {
    const viewModeSubject = new BehaviorSubject<ViewMode>('edit');
    updateViewMode = (viewMode) => viewModeSubject.next(viewMode);

    action = new EditPanelAction();
    context = {
      embeddable: {
        viewMode: viewModeSubject,
        onEdit: jest.fn(),
        isEditingEnabled: jest.fn().mockReturnValue(true),
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

  it('is incompatible when view mode is view', async () => {
    (context.embeddable as PublishesViewMode).viewMode = new BehaviorSubject<ViewMode>('view');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when editing is not enabled', async () => {
    context.embeddable.isEditingEnabled = jest.fn().mockReturnValue(false);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the onEdit method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.onEdit).toHaveBeenCalled();
  });

  it('returns an href if one is available', async () => {
    const href = '#/very-fun-panel-type/edit';
    context.embeddable.getEditHref = jest.fn().mockReturnValue(href);
    expect(await action.getHref(context)).toBe(href);
  });

  it('calls onChange when view mode changes', () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateViewMode('view');
    expect(onChange).toHaveBeenCalledWith(false, action);
  });
});
