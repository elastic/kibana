/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel, apiCanPinPanel } from '@kbn/presentation-containers';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { apiPublishesLayout } from '@kbn/dashboard-plugin/public';
import { map } from 'rxjs';
import { ACTION_CREATE_TIME_SLIDER } from './constants';

const compatibilityCheck = (api: unknown | null) =>
  apiCanAddNewPanel(api) &&
  apiCanPinPanel(api) &&
  apiPublishesLayout(api) &&
  !Object.values(api.layout$.getValue().controls).find(
    (control) => control.type === TIME_SLIDER_CONTROL
  );

export const createTimeSliderAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_TIME_SLIDER,
  order: 0,
  getIconType: () => 'controlsHorizontal',
  couldBecomeCompatible: ({ embeddable }) =>
    apiCanAddNewPanel(embeddable) && apiCanPinPanel(embeddable),
  getCompatibilityChangesSubject: ({ embeddable }) =>
    apiPublishesLayout(embeddable) ? embeddable.layout$.pipe(map(() => undefined)) : undefined,
  isCompatible: async ({ embeddable }) => compatibilityCheck(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable) || !apiCanPinPanel(embeddable))
      throw new IncompatibleActionError();
    const newPanel = await embeddable.addNewPanel<{}, { uuid: string }>({
      panelType: TIME_SLIDER_CONTROL,
      serializedState: {
        rawState: {},
      },
    });
    if (!newPanel) throw new Error('Failed tp create time slider panel');
    embeddable.pinPanel(newPanel.uuid);
  },
  getDisplayName: () =>
    i18n.translate('controls.timeSlider.displayNameAriaLabel', {
      defaultMessage: 'Time slider',
    }),

  getDisplayNameTooltip: ({ embeddable }) =>
    compatibilityCheck(embeddable)
      ? i18n.translate('controls.timeSlider.tooltip', {
          defaultMessage: 'Add a time slider control to your dashboard.',
        })
      : i18n.translate('controls.timeSlider.disabledTooltip', {
          defaultMessage: 'Only one time slider control can be added per dashboard.',
        }),
});
