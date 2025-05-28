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
import { SerializedPanelState, ViewMode } from '@kbn/presentation-publishing';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, of } from 'rxjs';
import { SAVED_BOOK_ID } from '../../react_embeddables/saved_book/constants';
import { BookApi, BookSerializedState } from '../../react_embeddables/saved_book/types';
import { savedStateManager, unsavedStateManager } from './session_storage';

const BOOK_EMBEDDABLE_ID = 'BOOK_EMBEDDABLE_ID';

export const StateManagementExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  const [bookApi, setBookApi] = useState<BookApi | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const parentApi = useMemo(() => {
    const unsavedSavedBookState = unsavedStateManager.get();
    const lastSavedbookState = savedStateManager.get();
    const lastSavedBookState$ = new BehaviorSubject(lastSavedbookState);

    return {
      viewMode$: new BehaviorSubject<ViewMode>('edit'),
      getSerializedStateForChild: (childId: string) => {
        if (childId === BOOK_EMBEDDABLE_ID) {
          return unsavedSavedBookState ? unsavedSavedBookState : lastSavedbookState;
        }

        return {
          rawState: {},
          references: [],
        };
      },
      lastSavedStateForChild$: (childId: string) => {
        return childId === BOOK_EMBEDDABLE_ID ? lastSavedBookState$ : of(undefined);
      },
      getLastSavedStateForChild: (childId: string) => {
        return childId === BOOK_EMBEDDABLE_ID
          ? lastSavedBookState$.value
          : {
              rawState: {},
              references: [],
            };
      },
      setLastSavedBookState: (savedState: SerializedPanelState<BookSerializedState>) => {
        lastSavedBookState$.next(savedState);
      },
    };
  }, []);

  useEffect(() => {
    if (!bookApi) {
      return;
    }
    const subscription = bookApi.hasUnsavedChanges$.subscribe((nextHasUnsavedChanges) => {
      if (!nextHasUnsavedChanges) {
        unsavedStateManager.clear();
        setHasUnsavedChanges(false);
        return;
      }

      unsavedStateManager.set(bookApi.serializeState());
      setHasUnsavedChanges(true);
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
          providing the last saved state or last unsaved state to the embeddable.
        </p>

        <p>
          The page renders the embeddable with <strong>EmbeddableRenderer</strong> component.
          EmbeddableRender passes the embeddableApi to the page by calling{' '}
          <strong>onApiAvailable</strong>.
        </p>

        <p>
          The page subscribes to <strong>embeddableApi.hasUnsavedChanges</strong> to by notified of
          unsaved changes. The page persists unsaved changes in session storage. The page provides
          unsaved changes to the embeddable with <strong>pageApi.getSerializedStateForChild</strong>
          .
        </p>

        <p>
          The page gets embeddable state by calling <strong>embeddableApi.serializeState</strong>.
          The page persists embeddable state in session storage.
        </p>

        <p>
          The page provides unsaved state or last saved state to the embeddable with{' '}
          <strong>pageApi.getSerializedStateForChild</strong>.
        </p>

        <p>
          <EuiButtonEmpty
            color={'warning'}
            onClick={() => {
              savedStateManager.clear();
              unsavedStateManager.clear();
              window.location.reload();
            }}
          >
            Reset example
          </EuiButtonEmpty>
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        {hasUnsavedChanges && (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">Unsaved changes</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                disabled={!bookApi}
                onClick={() => {
                  bookApi?.resetUnsavedChanges();
                }}
              >
                Reset
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            disabled={!hasUnsavedChanges}
            onClick={() => {
              if (!bookApi) {
                return;
              }

              const savedState = bookApi.serializeState();
              parentApi.setLastSavedBookState(savedState);
              savedStateManager.set(savedState);
              unsavedStateManager.clear();
            }}
          >
            Save
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EmbeddableRenderer<BookSerializedState, BookApi>
        type={SAVED_BOOK_ID}
        maybeId={BOOK_EMBEDDABLE_ID}
        getParentApi={() => parentApi}
        onApiAvailable={(api) => {
          setBookApi(api);
        }}
      />
    </div>
  );
};
