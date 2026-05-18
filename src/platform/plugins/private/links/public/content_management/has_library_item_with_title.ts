/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { linksClient } from './links_content_management_client';

export const hasLibraryItemWithTitle = async (title: string) => {
  const { hits } = await linksClient.search(
    {
      text: `"${title}"`,
      limit: 10,
    },
    { onlyTitle: true }
  );

  return hits.some((obj) => obj.attributes.title?.toLowerCase() === title.toLowerCase());
};
