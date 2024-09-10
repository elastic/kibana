/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { ADD_PANEL_TRIGGER, Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  ADD_SAVED_BOOK_ACTION_ID,
  SAVED_BOOK_ID,
} from '../../../react_embeddables/saved_book/constants';
import {
  BookApi,
  BookRuntimeState,
  BookSerializedState,
} from '../../../react_embeddables/saved_book/types';
import { getPageApi } from '../page_api';

export const StateManagementExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const { componentApi, pageApi } = useMemo(() => {
    return getPageApi();
  }, []);

  const hasEmbeddableState = useStateFromPublishingSubject(componentApi.hasEmbeddableState$);

  return (
    <div>
      <EuiCallOut>
        <p>
          Each embeddable manages its own state. The page is only responsible for persisting and
          providing the last persisted state to the embeddable.
        </p>

        <p>
          The page renders the embeddable with <strong>ReactEmbeddableRenderer</strong> component.
          On mount, ReactEmbeddableRenderer component calls{' '}
          <strong>pageApi.getSerializedStateForChild</strong> to get the last saved state.
          ReactEmbeddableRenderer component then calls{' '}
          <strong>pageApi.getRuntimeStateForChild</strong> to get the last session&apos;s unsaved
          changes. ReactEmbeddableRenderer merges last saved state with unsaved changes and passes
          the merged state to the embeddable factory. ReactEmbeddableRender passes the embeddableApi
          to the page by calling <strong>onApiAvailable</strong>.
        </p>

        <p>
          The page subscribes to <strong>embeddableApi.unsavedChanges</strong> to receive embeddable
          unsaved changes. The page persists unsaved changes in session storage. The page provides
          unsaved changes to the embeddable with <strong>pageApi.getRuntimeStateForChild</strong>.
        </p>

        <p>
          The page gets embeddable state by calling <strong>embeddableApi.serializeState</strong>.
          The page persists embeddable state in session storage. The page provides last saved state
          to the embeddable with <strong>pageApi.getSerializedStateForChild</strong>.
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      {!hasEmbeddableState && (
        <EuiEmptyPrompt
          title={<h2>There is no embeddable state from a previous session.</h2>}
          body={
            <p>
              Click the button to add a <em>book</em> embeddable. Unsaved book state is provided to
              the page by calling <strong>pageApi.addNewPanel</strong>.
            </p>
          }
          actions={
            <EuiButton
              color="primary"
              fill
              onClick={() => {
                const createBookAction = uiActions.getAction(
                  ADD_SAVED_BOOK_ACTION_ID
                ) as Action<EmbeddableApiContext>;
                if (createBookAction) {
                  createBookAction.execute({
                    embeddable: pageApi,
                    trigger: {
                      id: ADD_PANEL_TRIGGER,
                    },
                  });
                }
              }}
            >
              Create book embeddable
            </EuiButton>
          }
        />
      )}

      {hasEmbeddableState && (
        <ReactEmbeddableRenderer<BookSerializedState, BookRuntimeState, BookApi>
          type={SAVED_BOOK_ID}
          getParentApi={() => pageApi}
          onApiAvailable={(api) => {
            componentApi.setBookApi(api);
          }}
        />
      )}
    </div>
  );
};
