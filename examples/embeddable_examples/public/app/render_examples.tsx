/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { Api, State } from '../react_embeddables/search/types';
import { SEARCH_EMBEDDABLE_ID } from '../react_embeddables/search/constants';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiSuperDatePicker, EuiText, OnTimeChangeProps } from '@elastic/eui';
import { BehaviorSubject, Subject } from 'rxjs';
import { TimeRange } from '@kbn/es-query';
import { useBatchedOptionalPublishingSubjects, useStateFromPublishingSubject } from '@kbn/presentation-publishing';

export const RenderExamples = () => {
  const initialState = useMemo(() => {
    return {
      rawState: {
        timeRange: undefined
      },
      references: [],
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parentApi = useMemo(() => {
    return {
      reload$: new Subject<void>(),
      timeRange$: new BehaviorSubject<TimeRange>({
        from: 'now-24h',
        to: 'now',
      }),
    }
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [api, setApi] = useState<Api | null>(null);
  const [dataLoading, timeRange] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    parentApi.timeRange$
  );

  return (
    <div>
      <EuiSuperDatePicker
        isLoading={dataLoading ? dataLoading : false}
        start={timeRange.from}
        end={timeRange.to}
        onTimeChange={({ start, end }: OnTimeChangeProps) => {
          parentApi.timeRange$.next({
            from: start,
            to: end
          });
        }}
        onRefresh={() => {
          parentApi.reload$.next();
        }}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <p>
              Use <strong>ReactEmbeddableRenderer</strong> to render embeddables.
            </p>
          </EuiText>

          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<ReactEmbeddableRenderer<State, Api>
  type={SEARCH_EMBEDDABLE_ID}
  state={initialState}
  parentApi={parentApi}
  onApiAvailable={(newApi) => {
    setApi(newApi);
  }}
/>`}
          </EuiCodeBlock>

          <EuiSpacer size="s" />

          <ReactEmbeddableRenderer<State, Api>
            type={SEARCH_EMBEDDABLE_ID}
            state={initialState}
            parentApi={parentApi}
            onApiAvailable={(newApi) => {
              setApi(newApi);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <p>
              Use <strong>hidePresentationPanelChrome</strong> prop to render embeddable without presentation panel wrapper.
            </p>
          </EuiText>
          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<ReactEmbeddableRenderer<State, Api>
  type={SEARCH_EMBEDDABLE_ID}
  state={initialState}
  parentApi={parentApi}
  onApiAvailable={(newApi) => {
    setApi(newApi);
  }}
  hidePresentationPanelChrome={true}
/>`}
          </EuiCodeBlock>

          <EuiSpacer size="s" />

          <ReactEmbeddableRenderer<State, Api>
            type={SEARCH_EMBEDDABLE_ID}
            state={initialState}
            parentApi={parentApi}
            onApiAvailable={(newApi) => {
              setApi(newApi);
            }}
            hidePresentationPanelChrome={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      
    </div>
  );
};
