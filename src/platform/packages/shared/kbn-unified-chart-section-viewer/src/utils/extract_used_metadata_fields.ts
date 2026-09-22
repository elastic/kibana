/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const extractUsedMetadataFields = ({
  metadataFields,
  filters,
}: {
  metadataFields: readonly string[];
  filters: readonly string[];
}): string[] => {
  if (!metadataFields.length || !filters.length) {
    return [];
  }

  return metadataFields.filter((field) => {
    const re = new RegExp(`\\b${field}\\b`);
    return filters.some((filter) => re.test(filter));
  });
};
