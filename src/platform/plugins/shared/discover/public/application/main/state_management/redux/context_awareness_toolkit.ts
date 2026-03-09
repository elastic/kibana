/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContextAwarenessToolkit } from '../../../../context_awareness/toolkit';
import type { InternalStateStore } from './internal_state';
import { internalStateActions } from '.';

export const createContextAwarenessToolkit = ({
  internalState,
  tabId,
}: {
  internalState: InternalStateStore;
  tabId: string;
}): ContextAwarenessToolkit => {
  return {
    actions: {
      openInNewTab: async (params) => {
        await internalState.dispatch(internalStateActions.openInNewTabExtPointAction(params));
      },
      updateESQLQuery: (queryOrUpdater) => {
        internalState.dispatch(internalStateActions.updateESQLQuery({ tabId, queryOrUpdater }));
      },
      addFilter: (field, value, mode) => {
        internalState.dispatch(internalStateActions.addFilter({ tabId, field, value, mode }));
      },
      updateAdHocDataViews: async (adHocDataViews) => {
        await internalState.dispatch(internalStateActions.updateAdHocDataViews(adHocDataViews));
      },
      setExpandedDoc: (record, options) => {
        internalState.dispatch(
          internalStateActions.setExpandedDoc({
            tabId,
            expandedDoc: record,
            initialDocViewerTabId: options?.initialTabId,
          })
        );
      },
    },
  };
};
