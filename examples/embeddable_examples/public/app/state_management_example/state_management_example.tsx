/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/presentation-publishing';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, Subject } from 'rxjs';
import useMountedState from 'react-use/lib/useMountedState';
import { SAVED_BOOK_ID } from '../../react_embeddables/saved_book/constants';
import {
  BookApi,
  BookRuntimeState,
  BookSerializedState,
} from '../../react_embeddables/saved_book/types';
import { lastSavedStateSessionStorage } from './last_saved_state';
import { unsavedChangesSessionStorage } from './unsaved_changes';

export const StateManagementExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const isMounted = useMountedState();
  const saveNotification$ = useMemo(() => {
    return new Subject<void>();
  }, []);

  const [bookApi, setBookApi] = useState<BookApi | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!bookApi || !bookApi.unsavedChanges) {
      return;
    }
    const subscription = bookApi.unsavedChanges.subscribe((unsavedChanges) => {
      setHasUnsavedChanges(unsavedChanges !== undefined);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bookApi]);

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

      <EuiFlexGroup alignItems="flexEnd">
        {hasUnsavedChanges && (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">Unsaved changes</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={isSaving || !bookApi}
                onClick={() => {
                  bookApi?.resetUnsavedChanges?.();
                }}
              >
                Reset
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={isSaving || !hasUnsavedChanges}
            onClick={async () => {
              if (!bookApi) {
                return;
              }

              setIsSaving(true);
              const bookSerializedState = await bookApi.serializeState();
              if (isMounted()) {
                return;
              }
              lastSavedStateSessionStorage.save(bookSerializedState);
              saveNotification$.next(); // signals embeddable unsaved change tracking to update last saved state
              setIsSaving(false);
            }}
          >
            Save
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <ReactEmbeddableRenderer<BookSerializedState, BookRuntimeState, BookApi>
        type={SAVED_BOOK_ID}
        getParentApi={() => {
          return {
            /**
             * return last saved embeddable state
             */
            getSerializedStateForChild: (childId: string) => {
              return lastSavedStateSessionStorage.load();
            },
            /**
             * return previous session's unsaved changes for embeddable
             */
            getRuntimeStateForChild: (childId: string) => {
              return unsavedChangesSessionStorage.load();
            },
            saveNotification$,
            viewMode: new BehaviorSubject<ViewMode>('edit'),
          };
        }}
        onApiAvailable={(api) => {
          setBookApi(api);
        }}
      />
    </div>
  );
};
