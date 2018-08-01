/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const RepositorySchema = {
  uri: {
    type: 'text',
  },
  url: {
    type: 'text',
    index: false,
  },
  name: {
    type: 'text',
  },
  org: {
    type: 'text',
  },
};

export const RepositoryTypeName = 'repository';
export const RepositoryIndexName = () => {
  return `.codesearch-${RepositoryTypeName}`;
};
