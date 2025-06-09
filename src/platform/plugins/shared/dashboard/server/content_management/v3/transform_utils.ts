/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import { schema } from '@kbn/config-schema';
import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type {
  ControlGroupAttributes as ControlGroupAttributesV2,
  DashboardCrudTypes as DashboardCrudTypesV2,
} from '../../../common/content_management/v2';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import {
  transformControlGroupIn,
  transformControlGroupOut,
  transformOptionsOut,
  transformPanelsIn,
  transformPanelsOut,
  transformSearchSourceIn,
  transformSearchSourceOut,
} from './transforms';
import type {
  DashboardAttributes,
  DashboardGetOut,
  DashboardItem,
  ItemAttrsToSavedObjectParams,
  ItemAttrsToSavedObjectReturn,
  ItemAttrsToSavedObjectWithTagsParams,
  PartialDashboardItem,
  SavedObjectToItemReturn,
} from './types';

// transforms dashboard from the unknown types stored in the saved object to the content management schema
export function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  references?: SavedObjectReference[],
  getTagNamesFromReferences?: (references: SavedObjectReference[]) => string[]
): DashboardAttributes | Partial<DashboardAttributes> {
  const { description, title, version } = attributes;
  // Inject any tag names from references into the attributes
  let tags: string[] | undefined;
  if (getTagNamesFromReferences && references && references.length) {
    tags = getTagNamesFromReferences(references);
  }

  // try to maintain a consistent (alphabetical) order of keys
  let baseDashboard = {
    ...(description && { description }),
    ...(tags && tags.length && { tags }),
    title,
    ...(version && { version }),
  };
  if ('controlGroupInput' in attributes) {
    const controlGroupInput = transformControlGroupOut(attributes.controlGroupInput);
    baseDashboard = { ...baseDashboard, ...(controlGroupInput && { controlGroupInput }) };
  }
  if ('kibanaSavedObjectMeta' in attributes) {
    const kibanaSavedObjectMeta = transformSearchSourceOut(attributes.kibanaSavedObjectMeta);
    baseDashboard = { ...baseDashboard, ...(kibanaSavedObjectMeta && { kibanaSavedObjectMeta }) };
  }
  if ('optionsJSON' in attributes) {
    const options = transformOptionsOut(attributes.optionsJSON);
    baseDashboard = { ...baseDashboard, ...(options && { options }) };
  }
  if ('panelsJSON' in attributes || 'sections' in attributes) {
    const panels = transformPanelsOut(attributes.panelsJSON, attributes.sections);
    baseDashboard = { ...baseDashboard, ...(panels && { panels }) };
  }
  if ('refreshInterval' in attributes) {
    const refreshInterval = isRefreshIntervalSavedObject(attributes.refreshInterval)
      ? {
          refreshInterval: {
            pause: attributes.refreshInterval.pause,
            value: attributes.refreshInterval.value,
          },
        }
      : undefined;
    baseDashboard = { ...baseDashboard, ...(refreshInterval && { refreshInterval }) };
  }
  if ('timeFrom' in attributes) {
    const timeFrom = typeof attributes.timeFrom === 'string' ? attributes.timeFrom : undefined;
    baseDashboard = { ...baseDashboard, ...(timeFrom && { timeFrom }) };
  }
  if ('timeRestore' in attributes) {
    const timeRestore =
      typeof attributes.timeRestore === 'boolean' ? attributes.timeRestore : false;
    baseDashboard = { ...baseDashboard, ...(timeRestore && { timeRestore }) };
  }
  if ('timeTo' in attributes) {
    const timeTo = typeof attributes.timeTo === 'string' ? attributes.timeTo : undefined;
    baseDashboard = { ...baseDashboard, ...(timeTo && { timeTo }) };
  }
  return baseDashboard;
}

const isRefreshIntervalSavedObject = (
  refreshInterval: unknown
): refreshInterval is { pause: boolean; value: number } => {
  try {
    return Boolean(
      schema
        .object({
          pause: schema.boolean(),
          value: schema.number(),
          display: schema.maybe(schema.string()),
          section: schema.maybe(schema.number()),
        })
        .validate(refreshInterval)
    );
  } catch {
    return false;
  }
};

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
      controlGroupInput: transformControlGroupIn(controlGroupInput) as ControlGroupAttributesV2,
    }),
    description,
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: transformSearchSourceIn(kibanaSavedObjectMeta),
    }),
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON: panels ? transformPanelsIn(panels, true).panelsJSON : '[]',
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

// transforms dashboard from the content management schema to the unknown types stored in the saved object
export const itemAttrsToSavedObject = ({
  attributes,
  incomingReferences = [],
}: ItemAttrsToSavedObjectParams): ItemAttrsToSavedObjectReturn => {
  try {
    const { controlGroupInput, kibanaSavedObjectMeta, options, panels, tags, ...rest } = attributes;
    const { panelsJSON, sections } = transformPanelsIn(panels);

    const soAttributes = {
      ...rest,
      ...(controlGroupInput && {
        controlGroupInput: transformControlGroupIn(controlGroupInput),
      }),
      ...(options && {
        optionsJSON: JSON.stringify(options),
      }),
      ...(panels && {
        panelsJSON,
      }),
      ...(sections?.length && { sections }),
      ...(kibanaSavedObjectMeta && {
        kibanaSavedObjectMeta: transformSearchSourceIn(kibanaSavedObjectMeta),
      }),
    };
    return { attributes: soAttributes, references: incomingReferences, error: null };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

export const itemAttrsToSavedObjectWithTags = async ({
  attributes,
  replaceTagReferencesByName,
  incomingReferences = [],
}: ItemAttrsToSavedObjectWithTagsParams): Promise<ItemAttrsToSavedObjectReturn> => {
  const { tags, ...restAttributes } = attributes;
  // Tags can be specified as an attribute or in the incomingReferences.
  const soReferences =
    replaceTagReferencesByName && tags && tags.length
      ? await replaceTagReferencesByName({ references: incomingReferences, newTagNames: tags })
      : incomingReferences;
  return itemAttrsToSavedObject({
    attributes: restAttributes,
    incomingReferences: soReferences,
  });
};

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

interface SavedObjectToItemOptions {
  /**
   * attributes to include in the output item
   */
  allowedAttributes?: string[];
  /**
   * references to include in the output item
   */
  allowedReferences?: string[];
  getTagNamesFromReferences?: (references: SavedObjectReference[]) => string[];
}

export function savedObjectToItem(
  savedObject: SavedObject<DashboardSavedObjectAttributes>,
  partial: false,
  opts?: SavedObjectToItemOptions
): SavedObjectToItemReturn<DashboardItem>;

export function savedObjectToItem(
  savedObject: PartialSavedObject<DashboardSavedObjectAttributes>,
  partial: true,
  opts?: SavedObjectToItemOptions
): SavedObjectToItemReturn<PartialDashboardItem>;

export function savedObjectToItem(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | PartialSavedObject<DashboardSavedObjectAttributes>,
  partial: boolean /* partial arg is used to enforce the correct savedObject type */,
  { allowedAttributes, allowedReferences, getTagNamesFromReferences }: SavedObjectToItemOptions = {}
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
      ? pick(
          dashboardAttributesOut(attributes, references, getTagNamesFromReferences),
          allowedAttributes
        )
      : dashboardAttributesOut(attributes, references, getTagNamesFromReferences);

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
