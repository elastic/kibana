/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { OpenInNewTabParams, UpdateESQLQueryFn } from './types';

export interface DiscoverContextAwarenessToolkitActions {
  openInNewTab?: (params: OpenInNewTabParams) => void;
  updateESQLQuery?: UpdateESQLQueryFn;
  addFilter?: DocViewFilterFn;
  updateAdHocDataViews?: (adHocDataViews: DataView[]) => Promise<void>;
  setExpandedDoc?: (record?: DataTableRecord, options?: { initialTabId?: string }) => void;
}

export interface DiscoverContextAwarenessToolkit {
  readonly actions: DiscoverContextAwarenessToolkitActions;
}

export type DiscoverContextAwarenessToolkitOverrides = {
  actions?: Partial<DiscoverContextAwarenessToolkitActions>;
};

export const EMPTY_DISCOVER_CONTEXT_AWARENESS_TOOLKIT: DiscoverContextAwarenessToolkit = {
  actions: {},
};

export const mergeDiscoverContextAwarenessToolkits = (
  parent: DiscoverContextAwarenessToolkit,
  overrides?: DiscoverContextAwarenessToolkitOverrides
): DiscoverContextAwarenessToolkit => {
  if (!overrides) {
    return parent;
  }

  if (!overrides.actions) {
    return parent;
  }

  return {
    actions: {
      ...parent.actions,
      ...overrides.actions,
    },
  };
};
