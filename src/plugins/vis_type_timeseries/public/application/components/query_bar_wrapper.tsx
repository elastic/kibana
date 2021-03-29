/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useState } from 'react';

import { CoreStartContext } from '../contexts/query_input_bar_context';
import { IndexPatternValue } from '../../../common/types';

import { QueryStringInput, QueryStringInputProps } from '../../../../../plugins/data/public';
import { getDataStart } from '../../services';
import { fetchIndexPattern, isStringTypeIndexPattern } from '../../../common/index_patterns_utils';

type QueryBarWrapperProps = Pick<QueryStringInputProps, 'query' | 'onChange'> & {
  indexPatterns: IndexPatternValue[];
};

export function QueryBarWrapper({ query, onChange, indexPatterns }: QueryBarWrapperProps) {
  const { indexPatterns: indexPatternsService } = getDataStart();
  const [indexes, setIndexes] = useState<QueryStringInputProps['indexPatterns']>([]);

  const coreStartContext = useContext(CoreStartContext);

  useEffect(() => {
    async function fetchIndexes() {
      const i: QueryStringInputProps['indexPatterns'] = [];

      for (const index of indexPatterns ?? []) {
        if (isStringTypeIndexPattern(index)) {
          i.push(index);
        } else if (index?.id) {
          const fetchedIndex = await fetchIndexPattern(index, indexPatternsService);

          if (fetchedIndex.indexPattern) {
            i.push(fetchedIndex.indexPattern);
          }
        }
      }
      setIndexes(i);
    }

    fetchIndexes();
  }, [indexPatterns, indexPatternsService]);

  return (
    <QueryStringInput
      query={query}
      onChange={onChange}
      indexPatterns={indexes}
      {...coreStartContext}
    />
  );
}
