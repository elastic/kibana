/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { linksClient } from './links_content_management_client';

export async function loadFromLibrary(libraryId: string) {
  const { item } = await linksClient.get(libraryId);
  if (item.error) {
    throw item.error;
  }
  return item.attributes;
}
