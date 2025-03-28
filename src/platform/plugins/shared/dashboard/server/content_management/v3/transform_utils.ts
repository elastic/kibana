/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type {
  DashboardAttributes,
  DashboardGetOut,
  DashboardItem,
  ItemToSavedObjectReturn,
  PartialDashboardItem,
  SavedObjectToItemReturn,
} from './types';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type {
  ControlGroupAttributes as ControlGroupAttributesV2,
  DashboardCrudTypes as DashboardCrudTypesV2,
} from '../../../common/content_management/v2';
import {
  transformControlGroupIn,
  transformControlGroupOut,
  transformOptionsOut,
  transformPanelsIn,
  transformPanelsOut,
  transformSearchSourceIn,
  transformSearchSourceOut,
} from './transforms';

export function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  references?: SavedObjectReference[]
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
    ...(controlGroupInput && { controlGroupInput: transformControlGroupOut(controlGroupInput) }),
    ...(description && { description }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: transformSearchSourceOut(kibanaSavedObjectMeta),
    }),
    ...(optionsJSON && { options: transformOptionsOut(optionsJSON) }),
    ...(panelsJSON && { panels: transformPanelsOut(panelsJSON, embeddable, references) }),
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

export const getResultV3ToV2 = (
  result: DashboardGetOut,
  embeddable: EmbeddableStart
): DashboardCrudTypesV2['GetOut'] => {
  const { meta, item } = result;
  const { attributes, references, ...rest } = item;
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

  // TODO Find a way for the transform to handle the references
  const { panelsJSON, references: panelReferences } = transformPanelsIn(
    panels,
    embeddable,
    references
  );

  const v2Attributes = {
    ...(controlGroupInput && {
      controlGroupInput: transformControlGroupIn(controlGroupInput) as ControlGroupAttributesV2,
    }),
    description,
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: transformSearchSourceIn(kibanaSavedObjectMeta),
    }),
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON,
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
      references: [...references, ...panelReferences],
    },
  };
};

export const itemToSavedObject = (
  attributes: DashboardAttributes,
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = []
): ItemToSavedObjectReturn => {
  try {
    const { controlGroupInput, kibanaSavedObjectMeta, options, panels, ...rest } = attributes;
    const { panelsJSON, references: panelReferences } = transformPanelsIn(
      panels,
      embeddable,
      references
    );
    const soAttributes = {
      ...rest,
      ...(controlGroupInput && {
        controlGroupInput: transformControlGroupIn(controlGroupInput),
      }),
      ...(options && {
        optionsJSON: JSON.stringify(options),
      }),
      panelsJSON,
      ...(kibanaSavedObjectMeta && {
        kibanaSavedObjectMeta: transformSearchSourceIn(kibanaSavedObjectMeta),
      }),
    };
    return {
      attributes: soAttributes,
      references: [...references, ...panelReferences],
      error: null,
    };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

export interface SavedObjectToItemOptions {
  /**
   * attributes to include in the output item
   */
  allowedAttributes?: string[];
  /**
   * references to include in the output item
   */
  allowedReferences?: string[];
}

export function savedObjectToItem(
  savedObject: SavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: false,
  opts?: SavedObjectToItemOptions
): SavedObjectToItemReturn<DashboardItem>;

export function savedObjectToItem(
  savedObject: PartialSavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: true,
  opts?: SavedObjectToItemOptions
): SavedObjectToItemReturn<PartialDashboardItem>;

export function savedObjectToItem(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | PartialSavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: boolean /* partial arg is used to enforce the correct savedObject type */,
  { allowedAttributes, allowedReferences }: SavedObjectToItemOptions = {}
): SavedObjectToItemReturn<DashboardItem | PartialDashboardItem> {
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

  try {
    const attributesOut = allowedAttributes
      ? pick(dashboardAttributesOut(attributes, embeddable, references), allowedAttributes)
      : dashboardAttributesOut(attributes, embeddable, references);

    // if includeReferences is provided, only include references of those types
    const referencesOut = allowedReferences
      ? references?.filter((reference) => allowedReferences.includes(reference.type))
      : references;

    return {
      item: {
        id,
        type,
        updatedAt,
        updatedBy,
        createdAt,
        createdBy,
        attributes: attributesOut,
        error,
        namespaces,
        references: referencesOut,
        version,
        managed,
      },
      error: null,
    };
  } catch (e) {
    return { item: null, error: e };
  }
}
