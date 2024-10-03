/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type ControlGroupChainingSystem,
  type ControlLabelPosition,
  type ControlPanelsState,
  type SerializedControlState,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_SHOW_APPLY_SELECTIONS,
} from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON } from '@kbn/data-plugin/common';

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type {
  ControlGroupAttributes,
  DashboardAttributes,
  DashboardGetOut,
  DashboardItem,
  DashboardOptions,
} from './types';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type {
  ControlGroupAttributes as ControlGroupAttributesV2,
  DashboardCrudTypes as DashboardCrudTypesV2,
} from '../../../common/content_management/v2';

function controlGroupInputOut(
  controlGroupInput?: DashboardSavedObjectAttributes['controlGroupInput']
): ControlGroupAttributes | undefined {
  if (!controlGroupInput) {
    return;
  }
  const {
    panelsJSON,
    ignoreParentSettingsJSON,
    controlStyle,
    chainingSystem,
    showApplySelections,
  } = controlGroupInput;
  const panels = panelsJSON
    ? Object.entries(JSON.parse(panelsJSON) as ControlPanelsState<SerializedControlState>).map(
        ([id, { explicitInput, type, grow, width, order }]) => ({
          embeddableConfig: explicitInput,
          grow: grow ?? DEFAULT_CONTROL_GROW,
          id,
          order,
          type,
          width: width ?? DEFAULT_CONTROL_WIDTH,
        })
      )
    : [];

  const ignoreParentSettings = ignoreParentSettingsJSON
    ? JSON.parse(ignoreParentSettingsJSON)
    : DEFAULT_IGNORE_PARENT_SETTINGS;

  // try to maintain a consistent (alphabetical) order of keys
  return {
    chainingSystem: (chainingSystem as ControlGroupChainingSystem) ?? DEFAULT_CONTROL_CHAINING,
    controlStyle: (controlStyle as ControlLabelPosition) ?? DEFAULT_CONTROL_LABEL_POSITION,
    ignoreParentSettings,
    panels,
    showApplySelections: showApplySelections ?? DEFAULT_SHOW_APPLY_SELECTIONS,
  };
}

function kibanaSavedObjectMetaOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta']
): DashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  const searchSource = searchSourceJSON ? parseSearchSourceJSON(searchSourceJSON) : undefined;
  return {
    searchSource,
  };
}

function optionsOut(optionsJSON: string): DashboardAttributes['options'] {
  const { hidePanelTitles, useMargins, syncColors, syncTooltips, syncCursor } = JSON.parse(
    optionsJSON
  ) as DashboardOptions;
  return {
    hidePanelTitles,
    useMargins,
    syncColors,
    syncTooltips,
    syncCursor,
  };
}

export function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>
): DashboardAttributes | Partial<DashboardAttributes> {
  const {
    description,
    controlGroupInput,
    kibanaSavedObjectMeta,
    optionsJSON,
    panelsJSON,
    refreshInterval,
    timeFrom,
    timeRestore,
    timeTo,
    title,
    version,
  } = attributes;
  return {
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
    description,
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaOut(kibanaSavedObjectMeta),
    }),
    ...(optionsJSON && { options: optionsOut(optionsJSON) }),
    ...(panelsJSON && { panels: JSON.parse(panelsJSON) }),
    ...(refreshInterval && {
      refreshInterval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    timeFrom,
    timeRestore: timeRestore ?? false,
    timeTo,
    title,
    version,
  };
}

function controlGroupInputIn(
  controlGroupInput?: ControlGroupAttributes
): DashboardSavedObjectAttributes['controlGroupInput'] | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { panels, ignoreParentSettings, controlStyle, chainingSystem, showApplySelections } =
    controlGroupInput;
  const updatedPanels = Object.fromEntries(
    panels.map(({ embeddableConfig, ...restOfPanel }) => {
      const id = embeddableConfig.id ?? uuidv4();
      return [id, { ...restOfPanel, explicitInput: { ...embeddableConfig, id } }];
    })
  );
  return {
    chainingSystem,
    controlStyle,
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings),
    panelsJSON: JSON.stringify(updatedPanels),
    showApplySelections,
  };
}

function panelsIn(
  panels: DashboardAttributes['panels']
): DashboardSavedObjectAttributes['panelsJSON'] {
  const updatedPanels = panels.map(({ panelIndex, gridData, embeddableConfig, ...restPanel }) => {
    const idx = panelIndex ?? uuidv4();
    return {
      ...restPanel,
      embeddableConfig: {
        ...embeddableConfig,
        id: idx,
      },
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    };
  });

  return JSON.stringify(updatedPanels);
}

export const getResultV3ToV2 = (result: DashboardGetOut): DashboardCrudTypesV2['GetOut'] => {
  const { meta, item } = result;
  const { attributes, ...rest } = item;
  const {
    controlGroupInput,
    description,
    kibanaSavedObjectMeta: { searchSource },
    options,
    panels,
    refreshInterval,
    timeFrom,
    timeRestore,
    timeTo,
    title,
    version,
  } = attributes;

  const v2Attributes = {
    ...(controlGroupInput && {
      controlGroupInput: controlGroupInputIn(controlGroupInput) as ControlGroupAttributesV2,
    }),
    description,
    kibanaSavedObjectMeta: { searchSourceJSON: searchSource ? JSON.stringify(searchSource) : '{}' },
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON: panels ? panelsIn(panels) : '[]',
    refreshInterval,
    timeFrom,
    timeRestore,
    timeTo,
    title,
    version,
  };
  return {
    meta,
    item: {
      ...rest,
      attributes: v2Attributes,
    },
  };
};

export const itemAttrsToSavedObjectAttrs = (
  attributes: DashboardAttributes
): DashboardSavedObjectAttributes => {
  const {
    controlGroupInput,
    kibanaSavedObjectMeta: { searchSource },
    options,
    panels,
    ...rest
  } = attributes;
  const soAttributes = {
    ...rest,
    ...(controlGroupInput && {
      controlGroupInput: controlGroupInputIn(controlGroupInput),
    }),
    ...(options && {
      optionsJSON: JSON.stringify(options),
    }),
    ...(panels && {
      panelsJSON: panelsIn(panels),
    }),
    kibanaSavedObjectMeta: searchSource ? { searchSourceJSON: JSON.stringify(searchSource) } : {},
  };
  return soAttributes;
};

export const savedObjectToItem = (
  savedObject: SavedObject<DashboardSavedObjectAttributes>
): DashboardItem => {
  const {
    id,
    type,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    attributes,
    error,
    namespaces,
    references,
    version,
    managed,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    updatedBy,
    createdAt,
    createdBy,
    attributes: dashboardAttributesOut(attributes),
    error,
    namespaces,
    references,
    version,
    managed,
  };
};
