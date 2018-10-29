/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const REPOSITORY_GIT_STATUS_INDEX_TYPE = 'code-repository-git-status';
export const REPOSITORY_DELETE_STATUS_INDEX_TYPE = 'code-repository-delete-status';
export const REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE = 'code-repository-lsp-index-status';
export const REPOSITORY_INDEX_STATUS_INDEX_TYPE = 'code-repository-index-status';

export const mappings = {
  [REPOSITORY_GIT_STATUS_INDEX_TYPE]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
      cloneProgress: {
        properties: {
          isCloned: {
            type: 'boolean',
          },
          receivedObjects: {
            type: 'integer',
          },
          indexedObjects: {
            type: 'integer',
          },
          totalObjects: {
            type: 'integer',
          },
          localObjects: {
            type: 'integer',
          },
          totalDeltas: {
            type: 'integer',
          },
          indexedDeltas: {
            type: 'integer',
          },
          receivedBytes: {
            type: 'integer',
          },
        },
      },
    },
  },
  [REPOSITORY_DELETE_STATUS_INDEX_TYPE]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
    },
  },
  [REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
    },
  },
  [REPOSITORY_INDEX_STATUS_INDEX_TYPE]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
    },
  },
};
