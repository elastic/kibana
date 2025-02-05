/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HasEditCapabilities,
  HasParentApi,
  PublishesViewMode,
  PublishesWritableViewMode,
  ViewMode,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { ShowConfigPanelAction, ShowConfigPanelActionApi } from './show_config_panel_action';

describe('Show config panel action', () => {
  let action: ShowConfigPanelAction;
  let context: { embeddable: ShowConfigPanelActionApi };
  let updateViewMode: (viewMode: ViewMode) => void;

  beforeEach(() => {
    const viewModeSubject = new BehaviorSubject<ViewMode>('view');
    updateViewMode = jest.fn((viewMode) => viewModeSubject.next(viewMode));

    action = new ShowConfigPanelAction();
    context = {
      embeddable: {
        viewMode$: viewModeSubject,
        onShowConfig: jest.fn(),
        isReadOnlyEnabled: jest.fn().mockReturnValue({ read: true, write: false }),
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
    (context.embeddable as PublishesViewMode).viewMode$ = new BehaviorSubject<ViewMode>('edit');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when view is not enabled', async () => {
    context.embeddable.isReadOnlyEnabled = jest.fn().mockReturnValue({ read: false, write: false });
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls the onShowConfig method on execute if user has no write permissions', async () => {
    context.embeddable.isReadOnlyEnabled = jest.fn().mockReturnValue({ read: true, write: false });
    action.execute(context);
    expect(context.embeddable.onShowConfig).toHaveBeenCalled();
  });

  it('calls the onEdit method on execute if user has write permissions', async () => {
    // share the same view mode as the embeddable
    // @ts-expect-error viewMode$ is preset but TS wants additional type guards to be sure of it
    const viewMode$ = context.embeddable.viewMode$;
    const contextWithEditPermissions: {
      embeddable: ShowConfigPanelActionApi &
        HasEditCapabilities &
        HasParentApi<PublishesWritableViewMode>;
    } = {
      ...context,
      embeddable: {
        ...context.embeddable,
        // Write permission + edit enabled
        isReadOnlyEnabled: jest.fn().mockReturnValue({ read: true, write: true }),
        isEditingEnabled: jest.fn().mockReturnValue(true),
        onEdit: jest.fn(),
        parentApi: {
          viewMode$,
          setViewMode: updateViewMode,
        },
      },
    };
    await action.execute(contextWithEditPermissions);
    // it should not call showConfig
    expect(contextWithEditPermissions.embeddable.onShowConfig).not.toHaveBeenCalled();
    // rather it should switch view mode for the parentApi and call onEdit
    expect(contextWithEditPermissions.embeddable.parentApi.setViewMode).toHaveBeenCalledWith(
      'edit'
    );
    expect(contextWithEditPermissions.embeddable.onEdit).toHaveBeenCalled();
  });

  it('calls the showConfig as fallback method on execute if user has write permissions but cannot edit for some reason', async () => {
    // share the same view mode as the embeddable
    // @ts-expect-error viewMode$ is preset but TS wants additional type guards to be sure of it
    const viewMode$ = context.embeddable.viewMode$;
    const contextWithEditPermissions: {
      embeddable: ShowConfigPanelActionApi &
        HasEditCapabilities &
        HasParentApi<PublishesWritableViewMode>;
    } = {
      ...context,
      embeddable: {
        ...context.embeddable,
        // Write permission + edit disabled (i.e. managed dashboard)
        isReadOnlyEnabled: jest.fn().mockReturnValue({ read: true, write: true }),
        isEditingEnabled: jest.fn().mockReturnValue(false),
        onEdit: jest.fn(),
        parentApi: {
          viewMode$,
          setViewMode: updateViewMode,
        },
      },
    };
    await action.execute(contextWithEditPermissions);
    // it should switch view mode for the parentApi and call onEdit
    expect(contextWithEditPermissions.embeddable.parentApi.setViewMode).toHaveBeenNthCalledWith(
      1,
      'edit'
    );
    // but since the user cannot edit, it should not call onEdit
    expect(contextWithEditPermissions.embeddable.onEdit).not.toHaveBeenCalled();
    // fallabck to switch back to view mode and read only panel
    expect(contextWithEditPermissions.embeddable.parentApi.setViewMode).toHaveBeenNthCalledWith(
      2,
      'view'
    );
    // it should call showConfig
    expect(contextWithEditPermissions.embeddable.onShowConfig).toHaveBeenCalled();
  });

  it('calls onChange when view mode changes', () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateViewMode('edit');
    expect(onChange).toHaveBeenCalledWith(false, action);
  });

  it('should show a different icon based on the write permissions', () => {
    expect(action.getIconType(context)).toBe('glasses');
    expect(
      action.getIconType({
        ...context,
        embeddable: {
          ...context.embeddable,
          isReadOnlyEnabled: jest.fn().mockReturnValue({ read: true, write: true }),
        },
      })
    ).toBe('pencil');
  });

  it('should show a different label based on the write permissions', () => {
    expect(action.getDisplayName(context)).toBe('Show A very fun panel type configuration');
    expect(
      action.getDisplayName({
        ...context,
        embeddable: {
          ...context.embeddable,
          isReadOnlyEnabled: jest.fn().mockReturnValue({ read: true, write: true }),
        },
      })
    ).toBe('Edit A very fun panel type configuration');
  });
});
