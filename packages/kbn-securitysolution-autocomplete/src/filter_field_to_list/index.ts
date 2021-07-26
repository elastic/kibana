/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { typeMatch } from '../type_match';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/105731
// import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
type IFieldType = any;

/**
 * Given an array of lists and optionally a field this will return all
 * the lists that match against the field based on the types from the field
 * @param lists The lists to match against the field
 * @param field The field to check against the list to see if they are compatible
 */
export const filterFieldToList = (lists: ListSchema[], field?: IFieldType): ListSchema[] => {
  if (field != null) {
    const { esTypes = [] } = field;
    return lists.filter(({ type }) => esTypes.some((esType: string) => typeMatch(type, esType)));
  } else {
    return [];
  }
};
