/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { stringify } from 'query-string';
import { History, Location } from 'history';
import { url } from '../../common';
import { getQueryParams } from './get_query_params';

export function removeQueryParam(history: History, param: string, replace: boolean = true) {
  const oldLocation = history.location;
  const query = getQueryParams(oldLocation);

  delete query[param];

  const newSearch = stringify(url.encodeQuery(query), { sort: false, encode: false });
  const newLocation: Location<any> = {
    ...oldLocation,
    search: newSearch,
  };
  if (replace) {
    history.replace(newLocation);
  } else {
    history.push(newLocation);
  }
}
