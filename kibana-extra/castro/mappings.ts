/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const REPOSITORY_INDEX_TYPE = 'castro-repository';

const mappings = {
  [REPOSITORY_INDEX_TYPE]: {
    properties: {
      uri: {
        type: 'text',
      },
      url: {
        type: 'text',
      },
      name: {
        type: 'text',
      },
      org: {
        type: 'text',
      },
    },
  },
};

export default mappings;
