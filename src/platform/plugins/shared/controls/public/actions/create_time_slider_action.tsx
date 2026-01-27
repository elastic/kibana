/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type BehaviorSubject, map } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { apiCanPinPanels } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { ACTION_CREATE_TIME_SLIDER, TIME_SLIDER_CONTROL } from '@kbn/controls-constants';

interface SupportsTimeSliderControl {
  hasTimeSliderControl: boolean;
  layout$: BehaviorSubject<unknown>; // we don't care about the type of layout, we just need to respond to changes to it
}
const apiSupportsTimeSliderControl = (api: unknown): api is SupportsTimeSliderControl =>
  typeof (api as SupportsTimeSliderControl).hasTimeSliderControl === 'boolean' &&
  Boolean((api as SupportsTimeSliderControl).layout$);

const compatibilityCheck = (api: unknown | null) => {
  return apiCanPinPanels(api) && apiSupportsTimeSliderControl(api) && !api.hasTimeSliderControl;
};

export const createTimeSliderAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_TIME_SLIDER,
  order: 0,
  getIconType: () => 'controlsHorizontal',
  couldBecomeCompatible: ({ embeddable }) => apiCanPinPanels(embeddable),
  getCompatibilityChangesSubject: ({ embeddable }) =>
    apiSupportsTimeSliderControl(embeddable)
      ? embeddable.layout$.pipe(map(() => undefined))
      : undefined,
  isCompatible: async ({ embeddable }) => compatibilityCheck(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanPinPanels(embeddable)) throw new IncompatibleActionError();
    await embeddable.addPinnedPanel({
      panelType: TIME_SLIDER_CONTROL,
      serializedState: {
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
