/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useState } from 'react';

import { CoreStartContext } from '../contexts/query_input_bar_context';
import { DefaultIndexPatternContext } from '../contexts/default_index_context';
import type { IndexPatternValue } from '../../../common/types';

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
  const defaultIndex = useContext(DefaultIndexPatternContext);

  useEffect(() => {
    async function fetchIndexes() {
      const i: QueryStringInputProps['indexPatterns'] = [];

      for (const index of indexPatterns ?? []) {
        if (index) {
          if (isStringTypeIndexPattern(index)) {
            i.push(index);
          } else if (index?.id) {
            const { indexPattern } = await fetchIndexPattern(index, indexPatternsService);

            if (indexPattern) {
              i.push(indexPattern);
            }
          }
        } else if (defaultIndex) {
          i.push(defaultIndex);
        }
      }
      setIndexes(i);
    }

    fetchIndexes();
  }, [indexPatterns, indexPatternsService, defaultIndex]);

  return (
    <QueryStringInput
      query={query}
      onChange={onChange}
      indexPatterns={indexes}
      {...coreStartContext}
    />
  );
}
