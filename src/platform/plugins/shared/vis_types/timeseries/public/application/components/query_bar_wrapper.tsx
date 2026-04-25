/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import type { QueryStringInputProps } from '@kbn/kql/public';
import { QueryStringInput } from '@kbn/kql/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IndexPatternValue } from '../../../common/types';

import { getDataViewsStart } from '../../services';
import { fetchIndexPattern, isStringTypeIndexPattern } from '../../../common/index_patterns_utils';
import type { TimeseriesVisDependencies } from '../../plugin';

type QueryBarWrapperProps = Pick<QueryStringInputProps, 'query' | 'onChange' | 'isInvalid'> & {
  indexPatterns: IndexPatternValue[];
  'data-test-subj'?: string;
};

export function QueryBarWrapper({
  query,
  onChange,
  isInvalid,
  indexPatterns,
  'data-test-subj': dataTestSubj,
}: QueryBarWrapperProps) {
  const dataViews = getDataViewsStart();
  const [indexes, setIndexes] = useState<QueryStringInputProps['indexPatterns']>([]);

  const kibana = useKibana<TimeseriesVisDependencies>();
  const {
    appName,
    kql,
    storage,
    data,
    notifications,
    http,
    docLinks,
    uiSettings,
    usageCollection,
  } = kibana.services;

  useEffect(() => {
    async function fetchIndexes() {
      const i: QueryStringInputProps['indexPatterns'] = [];

      for (const index of indexPatterns ?? []) {
        if (index) {
          if (isStringTypeIndexPattern(index)) {
            i.push(index);
          } else if (index?.id) {
            const { indexPattern } = await fetchIndexPattern(index, dataViews);

            if (indexPattern) {
              i.push(indexPattern);
            }
          }
        } else {
          const defaultIndex = await dataViews.getDefault();

          if (defaultIndex) {
            i.push(defaultIndex);
          }
        }
      }
      setIndexes(i);
    }

    fetchIndexes();
  }, [indexPatterns, dataViews]);

  return (
    <QueryStringInput
      appName={appName}
      deps={{
        autocomplete: kql.autocomplete,
        notifications,
        http,
        docLinks,
        uiSettings,
        data,
        dataViews,
        storage,
        usageCollection,
      }}
      query={query}
      onChange={onChange}
      isInvalid={isInvalid}
      indexPatterns={indexes}
      dataTestSubj={dataTestSubj}
    />
  );
}
