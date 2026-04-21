/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map, type Observable } from 'rxjs';
import type { BehaviorSubject } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { apiCanPinPanels } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import {
  ACTION_CREATE_TIME_SLIDER,
  DEFAULT_TIME_SLIDER_STATE,
  TIME_SLIDER_CONTROL,
  pinnedPanelsContainTimeSlider,
} from '@kbn/controls-constants';
import { ADD_PANEL_CONTROL_GROUP } from './constants';

interface HasLayout {
  layout$: BehaviorSubject<{ pinnedPanels: Record<string, { type: string }> }>;
}

const apiHasLayout = (api: unknown): api is HasLayout =>
  Boolean((api as HasLayout)?.layout$) && typeof (api as HasLayout).layout$.getValue === 'function';

const isTimeSliderAddPanelDisabled = (embeddable: unknown): boolean =>
  apiHasLayout(embeddable) &&
  pinnedPanelsContainTimeSlider(embeddable.layout$.getValue().pinnedPanels);

export const createTimeSliderAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_TIME_SLIDER,
  order: 0,
  grouping: [ADD_PANEL_CONTROL_GROUP],
  getIconType: () => 'controls',
  couldBecomeCompatible: ({ embeddable }) => apiCanPinPanels(embeddable),
  getCompatibilityChangesSubject: ({ embeddable }) =>
    apiHasLayout(embeddable)
      ? (embeddable.layout$.pipe(map(() => undefined)) as Observable<undefined>)
      : undefined,
  isCompatible: async ({ embeddable }) => apiCanPinPanels(embeddable) && apiHasLayout(embeddable),
  getDisplayNameTooltip: (context) =>
    isTimeSliderAddPanelDisabled(context.embeddable)
      ? i18n.translate('controls.timeSlider.addPanelDisabledTooltip', {
          defaultMessage: 'Only one time slider control can be added per dashboard.',
        })
      : undefined,
  execute: async ({ embeddable }) => {
    if (!apiCanPinPanels(embeddable)) throw new IncompatibleActionError();
    if (isTimeSliderAddPanelDisabled(embeddable)) throw new IncompatibleActionError();
    await embeddable.addPinnedPanel({
      panelType: TIME_SLIDER_CONTROL,
      serializedState: {
        ...DEFAULT_TIME_SLIDER_STATE,
        grow: true,
        width: 'large',
      },
    });
  },
  getDisplayName: () =>
    i18n.translate('controls.timeSlider.displayNameAriaLabel', {
      defaultMessage: 'Time slider',
    }),
});
