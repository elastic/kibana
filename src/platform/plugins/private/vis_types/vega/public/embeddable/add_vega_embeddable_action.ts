/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { apiCanAddNewPanel, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaByValueState } from '../../server';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID } from '../constants';
import { getDefaultSpec } from '../default_spec';
import { VegaPanelIcon } from '../vega_icon';
import type { VegaEmbeddableApi } from './vega_embeddable';

export const getAddVegaEmbeddableAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_VEGA_EMBEDDABLE_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  order: 0,
  getIconType: () => VegaPanelIcon,
  getDisplayName: () => 'Vega',
  getDisplayNameTooltip: () =>
    i18n.translate('visTypeVega.dashboard.addPanelActionDescription', {
      defaultMessage: 'Use the Vega syntax to create new types of visualizations.',
      description: 'Vega and Vega-Lite are product names and should not be translated',
    }),
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable, returnFocus }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const vegaEmbeddable = await embeddable.addNewPanel<VegaByValueState, VegaEmbeddableApi>({
      panelType: VEGA_EMBEDDABLE_TYPE,
      serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
    });
    vegaEmbeddable?.onEdit({ isNewPanel: true, returnFocus });
  },
});
