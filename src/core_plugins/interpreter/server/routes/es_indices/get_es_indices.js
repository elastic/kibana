/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map } from 'lodash';

export function getESIndices(kbnIndex, elasticsearchClient) {
  const config = {
    index: kbnIndex,
    _source: 'index-pattern.title',
    q: 'type:"index-pattern"',
    size: 100,
  };

  return elasticsearchClient('search', config).then(resp => {
    return map(resp.hits.hits, '_source["index-pattern"].title');
  });
}
