/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { typeMatch } from '../type_match';
import { AutocompleteListsData } from '../field_value_lists';

/**
 * Given an array of lists and optionally a field this will return all
 * the lists that match against the field based on the types from the field
 *
 * NOTE: That we support one additional property from "FieldSpec" located here:
 * src/plugins/data/common/index_patterns/fields/types.ts
 * This type property is esTypes. If it exists and is on there we will read off the esTypes.
 * @param lists The lists to match against the field
 * @param field The field to check against the list to see if they are compatible
 */
export const filterFieldToList = (
  lists: AutocompleteListsData,
  field?: DataViewFieldBase & { esTypes?: string[] }
): AutocompleteListsData => {
  if (field != null) {
    const { esTypes = [] } = field;
    return {
      smallLists: lists.smallLists.filter(({ type }) =>
        esTypes.some((esType: string) => typeMatch(type, esType))
      ),
      largeLists: lists.largeLists.filter(({ type }) =>
        esTypes.some((esType: string) => typeMatch(type, esType))
      ),
    };
  } else {
    return { smallLists: [], largeLists: [] };
  }
};
