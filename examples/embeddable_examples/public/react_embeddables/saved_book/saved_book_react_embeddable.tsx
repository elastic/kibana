/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { StateComparators, PresentationContainer } from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  initializeStateManager,
  titleComparators,
  apiIsPresentationContainer,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';
import React from 'react';
import { merge } from 'rxjs';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { BookState } from '../../../server';
import { defaultBookState } from './default_book_state';
import { loadBook, saveBook } from './library_utils';
import type { BookApi } from './types';
import type { BookEmbeddableState, BookByReferenceState } from '../../../common';
import { BOOK_EMBEDDABLE_TYPE } from '../../../common';

const bookStateComparators: StateComparators<BookState> = {
  bookTitle: 'referenceEquality',
  authorName: 'referenceEquality',
  bookSynopsis: 'referenceEquality',
  numberOfPages: 'referenceEquality',
};

export const getSavedBookEmbeddableFactory = (core: CoreStart) => {
  const savedBookEmbeddableFactory: EmbeddableFactory<BookEmbeddableState, BookApi> = {
    type: BOOK_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const titleManager = initializeTitleManager(initialState);
      const savedObjectId = (initialState as BookByReferenceState).savedObjectId;
      const initialBookState = savedObjectId ? await loadBook(savedObjectId) : initialState;
      const bookStateManager = initializeStateManager<BookState>(
        initialBookState as BookState,
        defaultBookState
      );
      const isByReference = Boolean(savedObjectId);

      const serializeBook = (id?: string) => ({
        ...titleManager.getLatestState(),
        ...(id ? { savedObjectId: id } : bookStateManager.getLatestState()),
      });

      const serializeState = () => serializeBook(savedObjectId);

      const unsavedChangesApi = initializeUnsavedChanges<BookEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, bookStateManager.anyStateChange$),
        getComparators: () => {
          return {
            ...titleComparators,
            ...bookStateComparators,
            savedObjectId: 'skip', // saved book id will not change over the lifetime of the embeddable.
          };
        },
        onReset: async (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          if (!savedObjectId) bookStateManager.reinitializeState(lastSaved as BookState);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        onEdit: async () => {
          openLazyFlyout({
            core,
            parentApi: api.parentApi,
            loadContent: async ({ closeFlyout }) => {
              const { getSavedBookEditor } = await import('./saved_book_editor');
              return getSavedBookEditor({
                closeFlyout,
                stateManager: bookStateManager,
                isCreate: false,
                api,
                onSubmit: (result: { savedObjectId?: string }) => {
                  const nextIsByReference = Boolean(result.savedObjectId);

                  // if the by reference state has changed during this edit, reinitialize the panel.
                  if (
                    nextIsByReference !== isByReference &&
                    apiIsPresentationContainer(api.parentApi)
                  ) {
                    api.parentApi.replacePanel<BookEmbeddableState>(api.uuid, {
                      serializedState: serializeBook(result.savedObjectId),
                      panelType: api.type,
                    });
                  }
                },
              });
            },
          });
        },
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('embeddableExamples.savedbook.editBook.displayName', {
            defaultMessage: 'book',
          }),
        serializeState,

        // library transforms
        getSavedObjectId: () => savedObjectId,
        saveToLibrary: async (newTitle: string) => {
          bookStateManager.api.setBookTitle(newTitle);
          const newId = await saveBook(undefined, bookStateManager.getLatestState());
          return newId;
        },
        checkForDuplicateTitle: async (title) => {},
        getSerializedStateByValue: () => serializeBook() as BookState,
        getSerializedStateByReference: (newId) => serializeBook(newId) as BookByReferenceState,
        canLinkToLibrary: async () => !isByReference,
        canUnlinkFromLibrary: async () => isByReference,
      });

      const showLibraryCallout =
        apiHasParentApi(api) &&
        typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function';

      return {
        api,
        Component: () => {
          const [authorName, numberOfPages, bookTitle, synopsis] = useBatchedPublishingSubjects(
            bookStateManager.api.authorName$,
            bookStateManager.api.numberOfPages$,
            bookStateManager.api.bookTitle$,
            bookStateManager.api.bookSynopsis$
          );
          const { euiTheme } = useEuiTheme();

          return (
            <div
              css={css`
                width: 100%;
              `}
            >
              {showLibraryCallout && (
                <EuiCallOut
                  announceOnMount={false}
                  size="s"
                  color={'warning'}
                  title={
                    isByReference
                      ? i18n.translate('embeddableExamples.savedBook.libraryCallout', {
                          defaultMessage: 'Saved in library',
                        })
                      : i18n.translate('embeddableExamples.savedBook.noLibraryCallout', {
                          defaultMessage: 'Not saved in library',
                        })
                  }
                  iconType={isByReference ? 'folderCheck' : 'folderClosed'}
                />
              )}
              <div
                css={css`
                  padding: ${euiTheme.size.m};
                `}
              >
                <EuiFlexGroup
                  direction="column"
                  justifyContent="flexStart"
                  alignItems="stretch"
                  gutterSize="xs"
                >
                  <EuiFlexItem>
                    <EuiTitle size="m">
                      <EuiText>{bookTitle}</EuiText>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup wrap responsive={false} gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiBadge iconType="userAvatar" color="hollow">
                          {authorName}
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge iconType="copy" color="hollow">
                          {i18n.translate('embeddableExamples.savedBook.numberOfPages', {
                            defaultMessage: '{numberOfPages} pages',
                            values: { numberOfPages },
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>{synopsis}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </div>
          );
        },
      };
    },
  };
  return savedBookEmbeddableFactory;
};
