/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
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
import { PublishesDataLoading, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { SearchEmbeddableRenderer } from '../react_embeddables/search/search_embeddable_renderer';
import { SEARCH_EMBEDDABLE_TYPE } from '../react_embeddables/search/constants';
import type { SearchApi, SearchSerializedState } from '../react_embeddables/search/types';

function DatePicker({
  dataLoading$,
  onReload,
  timeRange,
  setTimeRange,
}: {
  dataLoading$: PublishesDataLoading['dataLoading$'];
  timeRange: TimeRange;
  setTimeRange: (timeRange: TimeRange) => void;
  onReload: () => void;
}) {
  const dataLoading = useStateFromPublishingSubject(dataLoading$);
  return (
    <EuiSuperDatePicker
      isLoading={dataLoading ?? false}
      start={timeRange.from}
      end={timeRange.to}
      onTimeChange={({ start, end }: OnTimeChangeProps) => {
        setTimeRange({
          from: start,
          to: end,
        });
      }}
      onRefresh={() => {
        onReload();
      }}
    />
  );
}

export const RenderExamples = () => {
  const parentApi = useMemo(() => {
    const timeRange$ = new BehaviorSubject<TimeRange>({
      from: 'now-24h',
      to: 'now',
    });
    const reload$ = new Subject<void>();
    return {
      reload$,
      onReload: () => {
        reload$.next();
      },
      getSerializedStateForChild: () => ({
        rawState: {
          timeRange: undefined,
        },
      }),
      timeRange$,
      setTimeRange: (timeRange: TimeRange | undefined) => {
        if (timeRange) timeRange$.next(timeRange);
      },
    };
    // only run onMount
  }, []);

  const [api, setApi] = useState<SearchApi | null>(null);
  const [hidePanelChrome, setHidePanelChrome] = useState<boolean>(false);
  const timeRange = useStateFromPublishingSubject(parentApi.timeRange$);

  return (
    <div>
      {api && (
        <DatePicker
          dataLoading$={api.dataLoading$}
          onReload={parentApi.onReload}
          setTimeRange={parentApi.setTimeRange}
          timeRange={timeRange}
        />
      )}

      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <p>
              Use <strong>EmbeddableRenderer</strong> to render embeddables.
            </p>
          </EuiText>

          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<EmbeddableRenderer<State, Api>
  type={SEARCH_EMBEDDABLE_TYPE}
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

          <EmbeddableRenderer<SearchSerializedState, SearchApi>
            key={hidePanelChrome ? 'hideChrome' : 'showChrome'}
            type={SEARCH_EMBEDDABLE_TYPE}
            getParentApi={() => parentApi}
            onApiAvailable={(newApi) => {
              setApi(newApi);
            }}
            hidePanelChrome={hidePanelChrome}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText>
            <p>To avoid leaking embeddable details, wrap EmbeddableRenderer in a component.</p>
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
