/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';

import {
  ACTION_CREATE_TIME_SLIDER,
  DEFAULT_TIME_SLIDER_STATE,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  apiCanPinPanels,
  apiHasType,
  apiIsPresentationContainer,
  apiPublishesChildren,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';

import { ADD_PANEL_CONTROL_GROUP } from './constants';

const compatibilityCheck = (api: unknown | null) =>
  apiIsPresentationContainer(api) && apiCanPinPanels(api);

const isDisabled = (api: unknown) => {
  if (!compatibilityCheck(api)) throw new IncompatibleActionError();
  return Object.values(api.children$.getValue()).some(
    (child) => apiHasType(child) && child.type === TIME_SLIDER_CONTROL
  );
};

export const createTimeSliderAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_TIME_SLIDER,
  order: 0,
  grouping: [ADD_PANEL_CONTROL_GROUP],
  getIconType: () => 'controls',
  getDisplayNameTooltip: ({ embeddable }) => {
    if (isDisabled(embeddable)) {
      return i18n.translate('controls.timeSlider.disabledTooltop', {
        defaultMessage: 'You can only add one time slider control per dashboard.',
      });
    }
    return i18n.translate('controls.timeSlider.tooltip', {
      defaultMessage: 'Add a time slider control to your dashboard.',
    });
  },
  isCompatible: async ({ embeddable }) => compatibilityCheck(embeddable),
  isDisabled: ({ embeddable }) => isDisabled(embeddable),
  getDisabledStateChangesSubject: ({ embeddable }) =>
    apiPublishesChildren(embeddable) ? embeddable.children$.pipe(map(() => undefined)) : undefined,
  execute: async ({ embeddable }) => {
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
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
