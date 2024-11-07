/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { visualizationsClient } from '../../content_management';

/** Returns an object matching a given title */
export async function findObjectByTitle(title: string) {
  if (!title) {
    return;
  }

  // Elastic search will return the most relevant results first, which means exact matches should come
  // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
  const response = await visualizationsClient.search(
    {
      limit: 10,
      text: `"${title}"`,
    },
    {
      searchFields: ['title'],
    }
  );
  return response.hits.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
}
