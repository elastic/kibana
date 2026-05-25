/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useContentListConfig } from '../../context';
import { useContentListState } from '../../state';
import type { ContentListAction, ContentListState } from '../../state';
import { CONTENT_LIST_ACTIONS } from '../../state';
import {
  decodeNewShape,
  encodeUrlState,
  getInitialQueryText,
  getSortingConfigKey,
  getSortingUrlConfigFromKey,
  hasNewShapeParams,
  mergeAndStringify,
  parseSearch,
} from './url_codec';
import type { HydratedUrlState, UrlStateSlices } from './types';
import { decodeLegacyParams } from './legacy_decoder';
import { useInRouterContext } from './router_context';
import { claimUrlSyncSlot, type UrlSyncSlotClaim } from './coordinator';

type ClientStateSlices = Pick<ContentListState, 'queryText' | 'sort'>;
type Dispatch = React.Dispatch<ContentListAction>;

const warnUnknownUrlValue = (key: string, value: unknown): void => {
  if (process.env.NODE_ENV !== 'production') {
    globalThis.console.warn(`[ContentListUrlSync] Ignoring unknown URL ${key} value`, value);
  }
};

const decodeUrlState = (
  search: string,
  validSortFields: ReadonlySet<string>,
  initialSort: ClientStateSlices['sort']
): HydratedUrlState => {
  const params = parseSearch(search);

  if (hasNewShapeParams(params)) {
    const newShapeState = decodeNewShape(search, validSortFields, initialSort, (value) =>
      warnUnknownUrlValue('sort', value)
    );
    return { kind: Object.keys(newShapeState).length > 0 ? 'new' : 'empty', state: newShapeState };
  }

  const legacy = decodeLegacyParams(params, validSortFields, warnUnknownUrlValue);
  if (legacy) {
    return { kind: 'legacy', state: legacy.state, consumed: legacy.consumed };
  }

  return { kind: 'empty', state: {} };
};

const getExpectedHydratedState = (
  decoded: UrlStateSlices,
  current: ClientStateSlices
): UrlStateSlices => ({
  queryText: decoded.queryText ?? current.queryText,
  sort: decoded.sort ?? current.sort,
});

const dispatchDecodedSlices = (
  decoded: UrlStateSlices,
  dispatch: Dispatch,
  current: ClientStateSlices
): void => {
  if (decoded.queryText !== undefined && decoded.queryText !== current.queryText) {
    dispatch({
      type: CONTENT_LIST_ACTIONS.SET_QUERY,
      payload: { queryText: decoded.queryText },
    });
  }

  if (
    decoded.sort &&
    (decoded.sort.field !== current.sort.field || decoded.sort.direction !== current.sort.direction)
  ) {
    dispatch({ type: CONTENT_LIST_ACTIONS.SET_SORT, payload: decoded.sort });
  }
};

const dispatchAllSlices = (
  resolved: Required<UrlStateSlices>,
  dispatch: Dispatch,
  current: ClientStateSlices
): void => {
  if (resolved.queryText !== current.queryText) {
    dispatch({
      type: CONTENT_LIST_ACTIONS.SET_QUERY,
      payload: { queryText: resolved.queryText },
    });
  }

  if (
    resolved.sort.field !== current.sort.field ||
    resolved.sort.direction !== current.sort.direction
  ) {
    dispatch({ type: CONTENT_LIST_ACTIONS.SET_SORT, payload: resolved.sort });
  }
};

/**
 * The content list URL sync component.
 *
 * @returns The content list URL sync component.
 */
export const ContentListUrlSync = (): JSX.Element | null => {
  const { features } = useContentListConfig();
  const inRouterContext = useInRouterContext();

  if (features.urlSync === false || !inRouterContext) {
    return null;
  }

  return <ContentListUrlSyncSlot />;
};

/**
 * Coordinates URL ownership when more than one URL-syncing list is mounted on
 * the same `history`. The first to mount becomes the primary and renders
 * {@link ContentListUrlSyncInner}; subsequent mounts log a one-shot dev warning
 * and render nothing so they do not collide with the primary on the same
 * `q`/`sort` keys. See [`coordinator.ts`](./coordinator.ts) for the long-term
 * direction (per-instance URL key namespacing).
 */
const ContentListUrlSyncSlot = (): JSX.Element | null => {
  const history = useHistory();
  const { id, queryKeyScope } = useContentListConfig();
  const [claim, setClaim] = useState<UrlSyncSlotClaim | null>(null);
  const hasWarnedRef = useRef(false);
  const label = id ?? queryKeyScope;

  useEffect(() => {
    const slot = claimUrlSyncSlot(history, label);
    setClaim(slot);
    return () => {
      slot.release();
      setClaim(null);
    };
  }, [history, label]);

  if (!claim) {
    return null;
  }

  if (!claim.isPrimary) {
    if (!hasWarnedRef.current) {
      hasWarnedRef.current = true;
      if (process.env.NODE_ENV !== 'production') {
        const primary = claim.primaryLabel ?? '<unknown>';
        const secondary = label ?? '<unknown>';
        globalThis.console.warn(
          `[ContentListUrlSync] Multiple URL-syncing lists detected on this route. ` +
            `Only the first ("${primary}") will sync with the URL; "${secondary}" is disabled. ` +
            `Set features.urlSync: false on secondary lists to silence this warning.`
        );
      }
    }
    return null;
  }

  return <ContentListUrlSyncInner />;
};

/**
 * The inner content list URL sync component. It is used to sync the URL state with the content list state.
 *
 * @returns The inner content list URL sync component.
 */
const ContentListUrlSyncInner = (): null => {
  const history = useHistory();
  const { features } = useContentListConfig();
  const { state, dispatch } = useContentListState();
  const sortingConfigKey = getSortingConfigKey(features.sorting);
  const initialQueryText = getInitialQueryText(features.search);
  const { initialSort, validSortFields } = useMemo(
    () => getSortingUrlConfigFromKey(sortingConfigKey),
    [sortingConfigKey]
  );
  const [hydrated, setHydrated] = useState(false);
  const lastAppliedSearchRef = useRef<string | null>(null);
  const stateRef = useRef<ClientStateSlices>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const result = decodeUrlState(history.location.search, validSortFields, initialSort);
    const expectedState = getExpectedHydratedState(result.state, stateRef.current);
    const expectedSearch = mergeAndStringify(
      history.location.search,
      encodeUrlState(expectedState, initialSort)
    );
    const canonicalUrlSearch = mergeAndStringify(
      history.location.search,
      encodeUrlState(result.state, initialSort),
      result.consumed
    );

    lastAppliedSearchRef.current = expectedSearch;
    dispatchDecodedSlices(result.state, dispatch, stateRef.current);

    if (canonicalUrlSearch !== history.location.search) {
      history.replace({ search: canonicalUrlSearch });
    }

    setHydrated(true);
  }, [dispatch, history, hydrated, initialSort, validSortFields]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const encoded = encodeUrlState({ queryText: state.queryText, sort: state.sort }, initialSort);
    const nextSearch = mergeAndStringify(history.location.search, encoded);

    if (nextSearch === history.location.search || nextSearch === lastAppliedSearchRef.current) {
      return;
    }

    lastAppliedSearchRef.current = nextSearch;
    history.replace({ search: nextSearch });
  }, [history, hydrated, initialSort, state.queryText, state.sort]);

  useEffect(
    () =>
      history.listen((location) => {
        const decoded = decodeNewShape(location.search, validSortFields, initialSort, (value) =>
          warnUnknownUrlValue('sort', value)
        );
        const resolved = {
          queryText: decoded.queryText ?? initialQueryText,
          sort: decoded.sort ?? initialSort,
        };
        lastAppliedSearchRef.current = mergeAndStringify(
          location.search,
          encodeUrlState(resolved, initialSort)
        );
        dispatchAllSlices(resolved, dispatch, stateRef.current);
      }),
    [dispatch, history, initialQueryText, initialSort, validSortFields]
  );

  return null;
};
