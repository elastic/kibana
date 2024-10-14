/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
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

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type {
  ControlGroupAttributes,
  DashboardAttributes,
  DashboardGetOut,
  DashboardItem,
  DashboardOptions,
  PartialDashboardItem,
} from './types';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../../dashboard_saved_object';
import type {
  ControlGroupAttributes as ControlGroupAttributesV2,
  DashboardCrudTypes as DashboardCrudTypesV2,
} from '../../../common/content_management/v2';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../common/content_management';

function controlGroupInputOut(
  controlGroupInput?: DashboardSavedObjectAttributes['controlGroupInput']
): ControlGroupAttributes | undefined {
  if (!controlGroupInput) {
    return;
  }
  const {
    panelsJSON,
    ignoreParentSettingsJSON,
    controlStyle = DEFAULT_CONTROL_LABEL_POSITION,
    chainingSystem = DEFAULT_CONTROL_CHAINING,
    showApplySelections = DEFAULT_SHOW_APPLY_SELECTIONS,
  } = controlGroupInput;
  const controls = panelsJSON
    ? Object.entries(JSON.parse(panelsJSON) as ControlPanelsState<SerializedControlState>).map(
        ([
          id,
          {
            explicitInput,
            type,
            grow = DEFAULT_CONTROL_GROW,
            width = DEFAULT_CONTROL_WIDTH,
            order,
          },
        ]) => ({
          controlConfig: explicitInput,
          id,
          grow,
          order,
          type,
          width,
        })
      )
    : [];

  const {
    ignoreFilters = DEFAULT_IGNORE_PARENT_SETTINGS.ignoreFilters,
    ignoreQuery = DEFAULT_IGNORE_PARENT_SETTINGS.ignoreQuery,
    ignoreTimerange = DEFAULT_IGNORE_PARENT_SETTINGS.ignoreTimerange,
    ignoreValidations = DEFAULT_IGNORE_PARENT_SETTINGS.ignoreValidations,
  } = ignoreParentSettingsJSON ? JSON.parse(ignoreParentSettingsJSON) : {};

  // try to maintain a consistent (alphabetical) order of keys
  return {
    chainingSystem: chainingSystem as ControlGroupChainingSystem,
    controls,
    controlStyle: controlStyle as ControlLabelPosition,
    ignoreParentSettings: { ignoreFilters, ignoreQuery, ignoreTimerange, ignoreValidations },
    showApplySelections,
  };
}

function kibanaSavedObjectMetaOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta']
): DashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return {};
  }
  return { searchSource: parseSearchSourceJSON(searchSourceJSON) };
}

function optionsOut(optionsJSON: string): DashboardAttributes['options'] {
  const {
    hidePanelTitles = DEFAULT_DASHBOARD_OPTIONS.hidePanelTitles,
    useMargins = DEFAULT_DASHBOARD_OPTIONS.useMargins,
    syncColors = DEFAULT_DASHBOARD_OPTIONS.syncColors,
    syncCursor = DEFAULT_DASHBOARD_OPTIONS.syncCursor,
    syncTooltips = DEFAULT_DASHBOARD_OPTIONS.syncTooltips,
  } = JSON.parse(optionsJSON) as DashboardOptions;
  return {
    hidePanelTitles,
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
  };
}

function panelsOut(panelsJSON: string): DashboardAttributes['panels'] {
  const panels = JSON.parse(panelsJSON) as SavedDashboardPanel[];
  return panels.map(
    ({ embeddableConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      panelConfig: embeddableConfig,
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}

export function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>
): DashboardAttributes | Partial<DashboardAttributes> {
  const {
    controlGroupInput,
    description,
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
  // try to maintain a consistent (alphabetical) order of keys
  return {
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
    ...(description && { description }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaOut(kibanaSavedObjectMeta),
    }),
    ...(optionsJSON && { options: optionsOut(optionsJSON) }),
    ...(panelsJSON && { panels: panelsOut(panelsJSON) }),
    ...(refreshInterval && {
      refreshInterval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    ...(timeFrom && { timeFrom }),
    timeRestore: timeRestore ?? false,
    ...(timeTo && { timeTo }),
    title,
    ...(version && { version }),
  };
}

function controlGroupInputIn(
  controlGroupInput?: ControlGroupAttributes
): DashboardSavedObjectAttributes['controlGroupInput'] | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { controls, ignoreParentSettings, controlStyle, chainingSystem, showApplySelections } =
    controlGroupInput;
  const updatedControls = Object.fromEntries(
    controls.map(({ controlConfig, id = uuidv4(), ...restOfControl }) => {
      return [id, { ...restOfControl, explicitInput: { ...controlConfig, id } }];
    })
  );
  return {
    chainingSystem,
    controlStyle,
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings),
    panelsJSON: JSON.stringify(updatedControls),
    showApplySelections,
  };
}

function panelsIn(
  panels: DashboardAttributes['panels']
): DashboardSavedObjectAttributes['panelsJSON'] {
  const updatedPanels = panels.map(({ panelIndex, gridData, panelConfig, ...restPanel }) => {
    const idx = panelIndex ?? uuidv4();
    return {
      ...restPanel,
      embeddableConfig: panelConfig,
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    };
  });

  return JSON.stringify(updatedPanels);
}

function kibanaSavedObjectMetaIn(
  kibanaSavedObjectMeta: DashboardAttributes['kibanaSavedObjectMeta']
) {
  const { searchSource } = kibanaSavedObjectMeta;
  return { searchSourceJSON: JSON.stringify(searchSource ?? {}) };
}

export const getResultV3ToV2 = (result: DashboardGetOut): DashboardCrudTypesV2['GetOut'] => {
  const { meta, item } = result;
  const { attributes, ...rest } = item;
  const {
    controlGroupInput,
    description,
    kibanaSavedObjectMeta,
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
    kibanaSavedObjectMeta: kibanaSavedObjectMetaIn(kibanaSavedObjectMeta),
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON: panels ? panelsIn(panels) : '[]',
    refreshInterval,
    ...(timeFrom && { timeFrom }),
    timeRestore,
    ...(timeTo && { timeTo }),
    title,
    ...(version && { version }),
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
  const { controlGroupInput, kibanaSavedObjectMeta, options, panels, ...rest } = attributes;
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
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaIn(kibanaSavedObjectMeta),
    }),
  };
  return soAttributes;
};

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

export function savedObjectToItem(
  savedObject: SavedObject<DashboardSavedObjectAttributes>,
  partial: false,
  allowedAttributes?: string[]
): DashboardItem;

export function savedObjectToItem(
  savedObject: PartialSavedObject<DashboardSavedObjectAttributes>,
  partial: true,
  allowedAttributes?: string[]
): PartialDashboardItem;

export function savedObjectToItem(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | PartialSavedObject<DashboardSavedObjectAttributes>,
  partial: boolean,
  allowedAttributes?: string[]
): DashboardItem | PartialDashboardItem {
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
    attributes: allowedAttributes
      ? pick(dashboardAttributesOut(attributes), allowedAttributes)
      : dashboardAttributesOut(attributes),
    error,
    namespaces,
    references,
    version,
    managed,
  };
}
