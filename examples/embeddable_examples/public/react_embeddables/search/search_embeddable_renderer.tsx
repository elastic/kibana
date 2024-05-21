/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { TimeRange } from '@kbn/es-query';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { SearchApi, SearchSerializedState } from './types';
import { SEARCH_EMBEDDABLE_ID } from './constants';

interface Props {
  timeRange?: TimeRange;
}

export function SearchEmbeddableRenderer(props: Props) {
  const initialState = useMemo(() => {
    return {
      rawState: {
        timeRange: undefined,
      },
      references: [],
    };
    // only run onMount
  }, []);

  const parentApi = useMemo(() => {
    return {
      timeRange$: new BehaviorSubject(props.timeRange),
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    parentApi.timeRange$.next(props.timeRange);
  }, [props.timeRange, parentApi.timeRange$]);

  return (
    <ReactEmbeddableRenderer<SearchSerializedState, SearchApi>
      type={SEARCH_EMBEDDABLE_ID}
      state={initialState}
      parentApi={parentApi}
      hidePanelChrome={true}
    />
  );
}
