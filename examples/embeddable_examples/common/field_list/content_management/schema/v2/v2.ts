/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { SavedFieldListAttributes } from '../../../../../server/types';
import type { FieldListAttributes } from '../../../../../server/field_list/content_management/schema/v2';
import { FIELD_LIST_DATA_VIEW_REF_NAME } from '../../../constants';

export const fieldListAttributesDefinition: VersionableEmbeddableObject<
  SavedFieldListAttributes,
  FieldListAttributes
> = {
  itemToSavedObject: ({ attributes, references }) => {
    const { selectedFieldNames, dataViewId } = attributes;
    if (dataViewId) {
      // inject data view id as a reference
      references.push({
        name: FIELD_LIST_DATA_VIEW_REF_NAME,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: dataViewId,
      });
    }
    return {
      attributes: {
        // don't store the dataViewId, it's in the references
        selectedFieldNames,
      },
      references,
    };
  },
  savedObjectToItem: ({ attributes, references }) => {
    const { selectedFieldNames } = attributes;
    // inject data view id from references
    const dataViewRef = references.find((ref) => ref.name === FIELD_LIST_DATA_VIEW_REF_NAME);
    return {
      attributes: {
        selectedFieldNames,
        dataViewId: dataViewRef?.id,
      },
      // since all references are injected, we return an empty array
      references: [],
    };
  },
};
