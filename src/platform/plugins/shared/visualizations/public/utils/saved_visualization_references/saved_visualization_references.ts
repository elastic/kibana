/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
} from '@kbn/data-plugin/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { SavedVisState, VisSavedObject } from '../../types';
import type { SerializableAttributes } from '../../vis_types/vis_type_alias_registry';
import {
  extractControlsReferences,
  injectControlsReferences,
} from '../../../common/references/controls_references';
import {
  extractTimeSeriesReferences,
  injectTimeSeriesReferences,
} from '../../../common/references/timeseries_references';

export function convertSavedObjectAttributesToReferences(attributes: {
  kibanaSavedObjectMeta?: { searchSourceJSON: string };
  savedSearchId?: string;
}) {
  const references: Reference[] = [];
  if (attributes.kibanaSavedObjectMeta?.searchSourceJSON) {
    const searchSource = JSON.parse(attributes.kibanaSavedObjectMeta.searchSourceJSON);
    const indexId = searchSource.index.id;
    const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    references.push({
      name: refName,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      id: indexId,
    });
  }
  if (attributes.savedSearchId) {
    references.push({
      name: 'search_0',
      type: 'search',
      id: attributes.savedSearchId,
    });
  }
  return references;
}

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: SerializableAttributes;
  references: Reference[];
}) {
  const updatedAttributes = { ...attributes };
  const updatedReferences = [...references];

  if (updatedAttributes.searchSourceFields) {
    const [searchSource, searchSourceReferences] = extractSearchSourceReferences(
      updatedAttributes.searchSourceFields as SerializedSearchSourceFields
    );
    updatedAttributes.searchSourceFields = searchSource as SerializableAttributes;
    searchSourceReferences.forEach((r) => updatedReferences.push(r));
  }

  // Extract saved search
  if (updatedAttributes.savedSearchId) {
    updatedReferences.push({
      name: 'search_0',
      type: 'search',
      id: String(updatedAttributes.savedSearchId),
    });
    delete updatedAttributes.savedSearchId;
    updatedAttributes.savedSearchRefName = 'search_0';
  }

  // Extract index patterns from controls
  if (updatedAttributes.visState) {
    const visState = JSON.parse(String(updatedAttributes.visState)) as SavedVisState;

    if (visState.type && visState.params) {
      extractControlsReferences(visState.type, visState.params, updatedReferences);
      extractTimeSeriesReferences(visState.type, visState.params, updatedReferences);
    }

    updatedAttributes.visState = JSON.stringify(visState);
  }

  return {
    references: updatedReferences,
    attributes: updatedAttributes,
  };
}

export function injectReferences(savedObject: VisSavedObject, references: Reference[]) {
  if (savedObject.searchSourceFields) {
    savedObject.searchSourceFields = injectSearchSourceReferences(
      savedObject.searchSourceFields as any,
      references
    );
  }
  if (savedObject.savedSearchRefName) {
    const savedSearchReference = references.find(
      (reference) => reference.name === savedObject.savedSearchRefName
    );
    if (!savedSearchReference) {
      throw new Error(`Could not find saved search reference "${savedObject.savedSearchRefName}"`);
    }
    savedObject.savedSearchId = savedSearchReference.id;
    delete savedObject.savedSearchRefName;
  }

  const { type, params } = savedObject.visState ?? {};

  if (type && params) {
    injectControlsReferences(type, params, references);
    injectTimeSeriesReferences(type, params, references);
  }
}
