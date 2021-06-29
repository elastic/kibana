/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { find, keys, get } from 'lodash';
import { Filter, FILTERS } from '../../../../../common';

export const mapDefault = (filter: Filter) => {
  const metaProperty = /(^\$|meta)/;
  const key = find(keys(filter), (item) => !item.match(metaProperty));

  if (key) {
    const type = FILTERS.CUSTOM;
    const value = JSON.stringify(get(filter, key, {}));

    return { type, key, value };
  }

  throw filter;
};
