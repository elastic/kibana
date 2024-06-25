/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiText,
  OnTimeChangeProps,
} from '@elastic/eui';
import { BehaviorSubject, Subject } from 'rxjs';
import { TimeRange } from '@kbn/es-query';
import { useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import { SearchEmbeddableRenderer } from '../react_embeddables/search/search_embeddable_renderer';
import { SEARCH_EMBEDDABLE_ID } from '../react_embeddables/search/constants';
import type { SearchApi, SearchSerializedState } from '../react_embeddables/search/types';

export const RenderExamples = () => {
  const parentApi = useMemo(() => {
    return {
      reload$: new Subject<void>(),
      getSerializedStateForChild: () => ({
        rawState: {
          timeRange: undefined,
        },
      }),
      timeRange$: new BehaviorSubject<TimeRange>({
        from: 'now-24h',
        to: 'now',
      }),
    };
    // only run onMount
  }, []);

  const [api, setApi] = useState<SearchApi | null>(null);
  const [hidePanelChrome, setHidePanelChrome] = useState<boolean>(false);
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
            to: end,
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
  getParentApi={() => parentApi}
  onApiAvailable={(newApi) => {
    setApi(newApi);
  }}
  hidePanelChrome={hidePanelChrome}
/>`}
          </EuiCodeBlock>

          <EuiSpacer size="s" />

          <EuiSwitch
            label="Set hidePanelChrome to render embeddable without Panel wrapper."
            checked={hidePanelChrome}
            onChange={(e) => setHidePanelChrome(e.target.checked)}
          />

          <EuiSpacer size="s" />

          <ReactEmbeddableRenderer<SearchSerializedState, SearchSerializedState, SearchApi>
            key={hidePanelChrome ? 'hideChrome' : 'showChrome'}
            type={SEARCH_EMBEDDABLE_ID}
            getParentApi={() => parentApi}
            onApiAvailable={(newApi) => {
              setApi(newApi);
            }}
            hidePanelChrome={hidePanelChrome}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText>
            <p>To avoid leaking embeddable details, wrap ReactEmbeddableRenderer in a component.</p>
          </EuiText>

          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<SearchEmbeddableRenderer
  timeRange={timeRange}
/>`}
          </EuiCodeBlock>

          <EuiSpacer size="s" />

          <SearchEmbeddableRenderer timeRange={timeRange} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
