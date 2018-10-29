/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../../common/repository_utils';
import { RepositoryUri } from '../../../model';

export const SymbolSchema = {
  qname: {
    type: 'keyword',
  },
  symbolInformation: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'qname_path_hierarchy_analyzer',
      },
      kind: {
        type: 'integer',
        index: false,
      },
      location: {
        properties: {
          uri: {
            type: 'text',
            index: false,
            norms: false,
          },
        },
      },
    },
  },
};

export const SymbolAnalysisSettings = {
  analysis: {
    analyzer: {
      qname_path_hierarchy_analyzer: {
        type: 'custom',
        tokenizer: 'qname_path_hierarchy_tokenizer',
        filter: ['lowercase'],
      },
    },
    tokenizer: {
      qname_path_hierarchy_tokenizer: {
        type: 'path_hierarchy',
        delimiter: '.',
        reverse: 'true',
      },
    },
  },
};

export const SymbolTypeName = 'symbol';
export const SymbolIndexNamePrefix = `.code-${SymbolTypeName}`;
export const SymbolIndexName = (repoUri: RepositoryUri) => {
  return `${SymbolIndexNamePrefix}-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`;
};
