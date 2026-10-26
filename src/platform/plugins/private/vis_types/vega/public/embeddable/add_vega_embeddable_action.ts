/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { apiCanAddNewPanel, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ADD_CANVAS_ELEMENT_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaByValueState } from '../../server';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID } from '../constants';
import { getDefaultSpec } from '../default_spec';
import { VegaPanelIcon } from '../vega_icon';
import type { VegaEmbeddableApi } from './vega_embeddable';
import { openVegaEditor } from './open_vega_editor';

/** Canvas opts out of inline editing and does not return the new panel's API from `addNewPanel`. */
const parentDisablesInlineEditing = (api: unknown): boolean =>
  typeof api === 'object' && api !== null && 'canEditInline' in api && api.canEditInline === false;

export const getAddVegaEmbeddableAction = (
  core: CoreStart
): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_VEGA_EMBEDDABLE_ACTION_ID,
  order: 0,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  // Canvas's add menu only renders EUI icon names, not custom icon components.
  getIconType: (context) =>
    'trigger' in context && context.trigger?.id === ADD_CANVAS_ELEMENT_TRIGGER
      ? 'code'
      : VegaPanelIcon,
  getDisplayName: () => 'Vega',
  getDisplayNameTooltip: () =>
    i18n.translate('visTypeVega.dashboard.addPanelActionDescription', {
      defaultMessage: 'Use the Vega syntax to create new types of visualizations.',
      description: 'Vega and Vega-Lite are product names and should not be translated',
    }),
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable, returnFocus }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    // Known up front so the flyout can focus the panel before it has been added.
    const uuid = uuidv4();
    const addDefaultPanel = async () => {
      const panel = await embeddable.addNewPanel<VegaByValueState, VegaEmbeddableApi>({
        maybePanelId: uuid,
        panelType: VEGA_EMBEDDABLE_TYPE,
        serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
      });
      return panel ?? undefined;
    };

    if (parentDisablesInlineEditing(embeddable)) {
      await addDefaultPanel();
      return;
    }

    openVegaEditor({
      core,
      parentApi: embeddable,
      returnFocus,
      focusedPanelId: uuid,
      isNewPanel: true,
      loadApi: addDefaultPanel,
    });
  },
});
