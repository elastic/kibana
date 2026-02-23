/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import type { SearchApi, SearchSerializedState } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';

interface Props {
  timeRange?: TimeRange;
}

export function SearchEmbeddableRenderer(props: Props) {
  const initialState = useMemo(() => {
    return {
      timeRange: undefined,
    };
    // only run onMount
  }, []);

  const searchApi = useSearchApi({ timeRange: props.timeRange });

  return (
    <EmbeddableRenderer<SearchSerializedState, SearchApi>
      type={SEARCH_EMBEDDABLE_TYPE}
      getParentApi={() => ({
        ...searchApi,
        getSerializedStateForChild: () => initialState,
      })}
      hidePanelChrome={true}
    />
  );
}
