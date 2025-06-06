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
  ItemToSavedObjectParams,
  ItemToSavedObjectReturn,
  ItemToSavedObjectWithTagsParams,
  PartialDashboardItem,
  SavedObjectToItemReturn,
} from './types';

export async function dashboardAttributesOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  references?: SavedObjectReference[],
  getTagNamesFromReferences?: (references: SavedObjectReference[]) => string[]
): Promise<DashboardAttributes | Partial<DashboardAttributes>> {
  const {
    controlGroupInput,
    description,
    kibanaSavedObjectMeta,
    optionsJSON,
    panelsJSON,
    sections,
    refreshInterval,
    timeFrom,
    timeRestore,
    timeTo,
    title,
    version,
  } = attributes;
  // Inject any tag names from references into the attributes
  let tags: string[] | undefined;
  if (getTagNamesFromReferences && references && references.length) {
    tags = getTagNamesFromReferences(references);
  }

  // try to maintain a consistent (alphabetical) order of keys
  return {
    ...(controlGroupInput && { controlGroupInput: transformControlGroupOut(controlGroupInput) }),
    ...(description && { description }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: transformSearchSourceOut(kibanaSavedObjectMeta),
    }),
    ...(optionsJSON && { options: transformOptionsOut(optionsJSON) }),
    ...((panelsJSON || sections) && {
      panels: await transformPanelsOut({ panelsJSON, sections, embeddable, references }),
    }),
    ...(refreshInterval && {
      refreshInterval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    ...(tags && tags.length && { tags }),
    ...(timeFrom && { timeFrom }),
    timeRestore: timeRestore ?? false,
    ...(timeTo && { timeTo }),
    title,
    ...(version && { version }),
  };
}

export const getResultV3ToV2 = async (
  result: DashboardGetOut,
  embeddable: EmbeddableStart
): Promise<DashboardCrudTypesV2['GetOut']> => {
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

  const { panelsJSON, references: panelReferences } = await transformPanelsIn(panels, embeddable);

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

export const itemToSavedObject = async ({
  attributes,
  embeddable,
  references = [],
}: ItemToSavedObjectParams): Promise<ItemToSavedObjectReturn> => {
  try {
    const { controlGroupInput, kibanaSavedObjectMeta, options, panels, tags, ...rest } = attributes;
    const {
      panelsJSON,
      sections,
      references: panelReferences,
    } = panels
      ? await transformPanelsIn(panels, embeddable)
      : { panelsJSON: '[]', sections: [], references: [] };
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
    return {
      attributes: soAttributes,
      references: [...references, ...panelReferences],
      error: null,
    };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

export const itemToSavedObjectWithTags = async ({
  attributes,
  embeddable,
  replaceTagReferencesByName,
  references = [],
}: ItemToSavedObjectWithTagsParams): Promise<ItemToSavedObjectReturn> => {
  const { tags, ...restAttributes } = attributes;
  // Tags can be specified as an attribute or in the references.
  const soReferences =
    replaceTagReferencesByName && tags && tags.length
      ? await replaceTagReferencesByName({ references, newTagNames: tags })
      : references;
  return await itemToSavedObject({
    attributes: restAttributes,
    embeddable,
    references: soReferences,
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

export async function savedObjectToItem(
  savedObject: SavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: false,
  opts?: SavedObjectToItemOptions
): Promise<SavedObjectToItemReturn<DashboardItem>>;

export async function savedObjectToItem(
  savedObject: PartialSavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: true,
  opts?: SavedObjectToItemOptions
): Promise<SavedObjectToItemReturn<PartialDashboardItem>>;

export async function savedObjectToItem(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | PartialSavedObject<DashboardSavedObjectAttributes>,
  embeddable: EmbeddableStart,
  partial: boolean /* partial arg is used to enforce the correct savedObject type */,
  { allowedAttributes, allowedReferences, getTagNamesFromReferences }: SavedObjectToItemOptions = {}
): Promise<SavedObjectToItemReturn<DashboardItem | PartialDashboardItem>> {
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
          await dashboardAttributesOut(
            attributes,
            embeddable,
            references,
            getTagNamesFromReferences
          ),
          allowedAttributes
        )
      : await dashboardAttributesOut(attributes, embeddable, references, getTagNamesFromReferences);

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
