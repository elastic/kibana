/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  ActionButtonType,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { toSearchEmbeddableByValueState } from '../../common/agent_builder/to_search_embeddable_by_value_state';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverSessionApiData } from '../../server';
import type { SearchEmbeddableApi, SearchEmbeddablePanelApiState } from '../embeddable/types';
import {
  buildDiscoverSessionEmbeddableInput,
  getDiscoverSessionLocatorParams,
  getDiscoverSessionSeedTimeRange,
} from './discover_session_inline_state';
import { useDiscoverSessionUnifiedSearch } from './use_discover_session_unified_search';

const INLINE_TABLE_HEIGHT = 400;

export interface DiscoverSessionInlineProps {
  data: DiscoverSessionApiData;
  screenContextTimeRange?: TimeRange;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  locator?: DiscoverAppLocator;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}

export const DiscoverSessionInline = ({
  data,
  screenContextTimeRange,
  unifiedSearch,
  locator,
  registerActionButtons,
}: DiscoverSessionInlineProps) => {
  const SearchBar = unifiedSearch.ui.SearchBar;
  const embeddableApi = useRef<SearchEmbeddableApi | undefined>(undefined);

  const mappedState = useMemo(() => toSearchEmbeddableByValueState(data), [data]);
  const seedTimeRange = getDiscoverSessionSeedTimeRange({
    mappedTimeRange: mappedState.time_range,
    screenContextTimeRange,
  });
  const { searchBarProps, effectiveTimeRange } = useDiscoverSessionUnifiedSearch({
    timeRange: seedTimeRange,
  });

  const serializedState = useMemo(
    () => buildDiscoverSessionEmbeddableInput(data, effectiveTimeRange),
    [data, effectiveTimeRange]
  );

  const parentApi = useMemo(
    () => ({
      getSerializedStateForChild: () => serializedState,
    }),
    [serializedState]
  );

  useEffect(() => {
    embeddableApi.current?.setTimeRange(effectiveTimeRange);
  }, [effectiveTimeRange]);

  useEffect(() => {
    if (!locator) {
      registerActionButtons?.([]);
      return;
    }

    registerActionButtons?.([
      {
        type: ActionButtonType.SECONDARY,
        icon: 'discoverApp',
        label: i18n.translate('discover.agentBuilder.openInDiscoverButtonLabel', {
          defaultMessage: 'Open in Discover',
        }),
        handler: () => {
          void locator.navigate(
            getDiscoverSessionLocatorParams({ data, timeRange: effectiveTimeRange })
          );
        },
      },
    ]);
  }, [data, effectiveTimeRange, locator, registerActionButtons]);

  return (
    <div>
      <SearchBar {...searchBarProps} />
      <div
        css={css`
          height: ${INLINE_TABLE_HEIGHT}px;
          overflow: hidden;
        `}
      >
        <EmbeddableRenderer<SearchEmbeddablePanelApiState, SearchEmbeddableApi>
          maybeId={undefined}
          type={SEARCH_EMBEDDABLE_TYPE}
          getParentApi={() => parentApi}
          onApiAvailable={(api) => {
            embeddableApi.current = api;
            api.setTimeRange(effectiveTimeRange);
          }}
          hidePanelChrome
        />
      </div>
    </div>
  );
};
