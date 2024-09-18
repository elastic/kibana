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
  ControlGroupChainingSystem,
  ControlStyle,
  ControlsPanels,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_STYLE,
  RawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON } from '@kbn/data-plugin/common';

import { SavedObject } from '@kbn/core-saved-objects-api-server';
import {
  ControlGroupAttributes,
  DashboardAttributes,
  DashboardGetOut,
  DashboardItem,
} from './types';
import { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DashboardCrudTypes as DashboardCrudTypesV2 } from '../../../common/content_management/v2';

function controlGroupInputOut(
  controlGroupInput?: DashboardSavedObjectAttributes['controlGroupInput']
): ControlGroupAttributes | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { panelsJSON, ignoreParentSettingsJSON, controlStyle, chainingSystem, ...restInput } =
    controlGroupInput;
  const panels = panelsJSON
    ? Object.entries(JSON.parse(panelsJSON) as ControlsPanels).map(
        ([id, { explicitInput, ...restPanel }]) => ({
          embeddableConfig: explicitInput,
          id,
          ...restPanel,
        })
      )
    : [];

  return {
    ...restInput,
    panels,
    ...(ignoreParentSettingsJSON && { ignoreParentSettings: JSON.parse(ignoreParentSettingsJSON) }),
    controlStyle: (controlStyle as ControlStyle) ?? DEFAULT_CONTROL_STYLE,
    chainingSystem: (chainingSystem as ControlGroupChainingSystem) ?? DEFAULT_CONTROL_CHAINING,
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

export function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes
): DashboardAttributes {
  const { controlGroupInput, panelsJSON, optionsJSON, kibanaSavedObjectMeta, ...rest } = attributes;
  return {
    ...rest,
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
    ...(optionsJSON && { options: JSON.parse(optionsJSON) }),
    ...(panelsJSON && {
      panels: JSON.parse(panelsJSON),
    }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaOut(kibanaSavedObjectMeta),
    }),
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
  };
}

function controlGroupInputIn(
  controlGroupInput?: ControlGroupAttributes
): RawControlGroupAttributes | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { panels, ignoreParentSettings, ...restOfInput } = controlGroupInput;
  const updatedPanels = Object.fromEntries(
    panels.map(({ embeddableConfig, ...restOfPanel }) => {
      const id = embeddableConfig.id ?? uuidv4();
      return [id, { ...restOfPanel, explicitInput: { ...embeddableConfig, id } }];
    })
  );
  return {
    ...restOfInput,
    panelsJSON: JSON.stringify(updatedPanels),
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings ?? {}),
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
    kibanaSavedObjectMeta: { searchSource },
    options,
    panels,
    ...restAttributes
  } = attributes;
  const v2Attributes = {
    ...restAttributes,
    ...(controlGroupInput && { controlGroupInput: controlGroupInputIn(controlGroupInput) }),
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON: panels ? panelsIn(panels) : '[]',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSource ? JSON.stringify(searchSource) : '{}' },
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
