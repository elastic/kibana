/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse, ParsedQuery } from 'query-string';
import { Location } from 'history';

export function getQueryParams(location: Location): ParsedQuery {
  const search = (location.search || '').replace(/^\?/, '');
  const query = parse(search, { sort: false });
  return query;
}
