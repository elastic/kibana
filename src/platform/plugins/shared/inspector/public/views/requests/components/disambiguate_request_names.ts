/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupBy } from 'lodash';
import type { Request } from '../../../../common/adapters/request/types';

export function disambiguateRequestNames(requests: Request[]): Request[] {
  const requestsByName = groupBy(requests, (r) => r.name);

  const newNamesById = Object.entries(requestsByName).reduce<{ [requestId: string]: string }>(
    (acc, [name, reqs]) => {
      const moreThanOne = reqs.length > 1;
      reqs.forEach((req, idx) => {
        const id = req.id;
        acc[id] = moreThanOne ? `${name} (${idx + 1})` : name;
      });
      return acc;
    },
    {}
  );

  return requests.map((request) => ({
    ...request,
    name: newNamesById[request.id],
  }));
}
