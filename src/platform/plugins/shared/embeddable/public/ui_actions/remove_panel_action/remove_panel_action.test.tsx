/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { RemovePanelActionApi } from './remove_panel_action';
import { RemovePanelAction } from './remove_panel_action';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';

describe('Remove panel action', () => {
  let action: RemovePanelAction;
  let context: { embeddable: RemovePanelActionApi };

  beforeEach(() => {
    action = new RemovePanelAction();
    context = {
      embeddable: {
        uuid: 'superId',
        viewMode$: new BehaviorSubject<ViewMode>('edit'),
        parentApi: getMockPresentationContainer(),
      },
    };
  });

  describe('isCompatible', () => {
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
      context.embeddable.viewMode$ = new BehaviorSubject<ViewMode>('view');
      expect(await action.isCompatible(context)).toBe(false);
    });

    it('is incompatible when parent disables remove panels', async () => {
      context.embeddable.viewMode$ = new BehaviorSubject<ViewMode>('view');
      expect(
        await action.isCompatible({
          embeddable: {
            ...context.embeddable,
            parentApi: {
              ...context.embeddable.parentApi,
              canRemovePanels: () => false,
            },
          },
        })
      ).toBe(false);
    });
  });

  describe('execute', () => {
    it('calls the parent removePanel method on execute', async () => {
      action.execute(context);
      expect(context.embeddable.parentApi.removePanel).toHaveBeenCalled();
    });
  });
});
