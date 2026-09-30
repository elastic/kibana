/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { TimeRange } from '@kbn/es-query';
import { getDescription, getTitle } from '@kbn/presentation-publishing';
import type { PanelSettingsApi, PanelSettingsState } from './types';
import { apiSupportsPanelTimeRange } from './types';

const getInitialState = (api: PanelSettingsApi): PanelSettingsState => ({
  title: getTitle(api),
  hideTitle: api.hideTitle$.value,
  description: getDescription(api),
  hideBorder: api.hideBorder$.value,
  hasOwnTimeRange: Boolean(api.timeRange$?.value),
  timeRange: api.timeRange$?.value,
});

/**
 * Keeps a draft of the panel settings while the flyout is open.
 * Changes are only pushed to the embeddable when `apply` is called.
 */
export const usePanelSettings = (api?: PanelSettingsApi, fallbackTimeRange?: TimeRange) => {
  const [initialState] = useState(() => (api ? getInitialState(api) : undefined));
  const [state, setState] = useState<PanelSettingsState | undefined>(initialState);

  const updateState = useCallback(
    (update: Partial<PanelSettingsState>) =>
      setState((prev) => (prev ? { ...prev, ...update } : prev)),
    []
  );

  const hasChanges = useMemo(() => {
    if (!initialState || !state) return false;
    const resolve = ({ hasOwnTimeRange, timeRange, ...rest }: PanelSettingsState) => ({
      ...rest,
      timeRange: hasOwnTimeRange ? timeRange ?? fallbackTimeRange : undefined,
    });
    return !isEqual(resolve(initialState), resolve(state));
  }, [initialState, state, fallbackTimeRange]);

  const apply = useCallback(() => {
    if (!api || !state || !hasChanges) return;
    const { title, hideTitle, description, hideBorder, hasOwnTimeRange, timeRange } = state;
    // A title matching the default one is stored as undefined so the panel keeps
    // in sync with the saved object title
    if (title === api.defaultTitle$?.value) {
      api.setTitle(undefined);
    } else if (title !== api.title$.value) {
      api.setTitle(title);
    }
    if (hideTitle !== api.hideTitle$.value) api.setHideTitle(hideTitle);
    if (hideBorder !== api.hideBorder$.value) api.setHideBorder(hideBorder);
    if (description !== api.description$.value) api.setDescription(description);
    if (apiSupportsPanelTimeRange(api)) {
      const newTimeRange = hasOwnTimeRange ? timeRange ?? fallbackTimeRange : undefined;
      if (!isEqual(newTimeRange, api.timeRange$.value)) api.setTimeRange(newTimeRange);
    }
  }, [api, state, hasChanges, fallbackTimeRange]);

  return { state, updateState, hasChanges, apply };
};
