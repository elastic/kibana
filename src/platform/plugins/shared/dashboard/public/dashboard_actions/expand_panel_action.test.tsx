/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, take } from 'rxjs';
import { ExpandPanelActionApi, ExpandPanelAction } from './expand_panel_action';

describe('Expand panel action', () => {
  let action: ExpandPanelAction;
  let context: { embeddable: ExpandPanelActionApi };
  let expandedPanelId$: BehaviorSubject<string | undefined>;

  beforeEach(() => {
    expandedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
    action = new ExpandPanelAction();
    context = {
      embeddable: {
        uuid: 'superId',
        parentApi: {
          expandPanel: jest.fn(),
          expandedPanelId$,
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

  it('getCompatibilityChangesSubject emits when expandedPanelId changes', (done) => {
    const subject = action.getCompatibilityChangesSubject(context);
    subject?.pipe(take(1)).subscribe(() => {
      done();
    });
    expandedPanelId$.next('superPanelId');
  });

  it('returns the correct icon based on expanded panel id', async () => {
    expect(await action.getIconType(context)).toBe('expand');
    expandedPanelId$.next('superPanelId');
    expect(await action.getIconType(context)).toBe('minimize');
  });

  it('returns the correct display name based on expanded panel id', async () => {
    expect(await action.getDisplayName(context)).toBe('Maximize');
    expandedPanelId$.next('superPanelId');
    expect(await action.getDisplayName(context)).toBe('Minimize');
  });

  it('calls the parent expandPanel method on execute', async () => {
    action.execute(context);
    expect(context.embeddable.parentApi.expandPanel).toHaveBeenCalled();
  });
});
