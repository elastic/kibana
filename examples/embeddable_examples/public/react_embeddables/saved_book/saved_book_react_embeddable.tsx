/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  initializeTitles,
  SerializedTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { serializeBookAttributes, stateManagerFromAttributes } from './book_state';
import { SAVED_BOOK_ID } from './constants';
import { openSavedBookEditor } from './saved_book_editor';
import { loadBookAttributes, saveBookAttributes } from './saved_book_library';
import {
  BookApi,
  BookAttributes,
  BookByReferenceSerializedState,
  BookByValueSerializedState,
  BookRuntimeState,
  BookSerializedState,
} from './types';

const bookSerializedStateIsByReference = (
  state?: BookSerializedState
): state is BookByReferenceSerializedState => {
  return Boolean(state && (state as BookByReferenceSerializedState).savedBookId);
};

export const getSavedBookEmbeddableFactory = (core: CoreStart) => {
  const savedBookEmbeddableFactory: ReactEmbeddableFactory<
    BookSerializedState,
    BookRuntimeState,
    BookApi
  > = {
    type: SAVED_BOOK_ID,
    deserializeState: async (serializedState) => {
      // panel state is always stored with the parent.
      const titlesState: SerializedTitles = {
        title: serializedState.rawState.title,
        hidePanelTitles: serializedState.rawState.hidePanelTitles,
        description: serializedState.rawState.description,
      };

      const savedBookId = bookSerializedStateIsByReference(serializedState.rawState)
        ? serializedState.rawState.savedBookId
        : undefined;

      const attributes: BookAttributes = bookSerializedStateIsByReference(serializedState.rawState)
        ? await loadBookAttributes(serializedState.rawState.savedBookId)!
        : serializedState.rawState.attributes;

      // Combine the serialized state from the parent with the state from the
      // external store to build runtime state.
      return {
        ...titlesState,
        ...attributes,
        savedBookId,
      };
    },
    buildEmbeddable: async (state, buildApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const bookAttributesManager = stateManagerFromAttributes(state);
      const savedBookId$ = new BehaviorSubject(state.savedBookId);

      const api = buildApi(
        {
          ...titlesApi,
          onEdit: async () => {
            openSavedBookEditor(bookAttributesManager, false, core, api);
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('embeddableExamples.savedbook.editBook.displayName', {
              defaultMessage: 'book',
            }),
          serializeState: async () => {
            if (!Boolean(savedBookId$.value)) {
              // if this book is currently by value, we serialize the entire state.
              const bookByValueState: BookByValueSerializedState = {
                attributes: serializeBookAttributes(bookAttributesManager),
                ...serializeTitles(),
              };
              return { rawState: bookByValueState };
            }

            // if this book is currently by reference, we serialize the reference and write to the external store.
            const bookByReferenceState: BookByReferenceSerializedState = {
              savedBookId: savedBookId$.value!,
              ...serializeTitles(),
            };

            await saveBookAttributes(
              savedBookId$.value,
              serializeBookAttributes(bookAttributesManager)
            );
            return { rawState: bookByReferenceState };
          },

          // in place library transforms
          libraryId$: savedBookId$,
          saveToLibrary: async (newTitle: string) => {
            bookAttributesManager.bookTitle.next(newTitle);
            const newId = await saveBookAttributes(
              undefined,
              serializeBookAttributes(bookAttributesManager)
            );
            savedBookId$.next(newId);
            return newId;
          },
          checkForDuplicateTitle: async (title) => {},
          unlinkFromLibrary: () => {
            savedBookId$.next(undefined);
          },
          getByValueRuntimeSnapshot: () => {
            const snapshot = api.snapshotRuntimeState();
            delete snapshot.savedBookId;
            return snapshot;
          },
        },
        {
          savedBookId: [savedBookId$, (val) => savedBookId$.next(val)],
          ...bookAttributesManager.comparators,
          ...titleComparators,
        }
      );

      return {
        api,
        Component: () => {
          const [authorName, numberOfPages, savedBookId, bookTitle, synopsis] =
            useBatchedPublishingSubjects(
              bookAttributesManager.authorName,
              bookAttributesManager.numberOfPages,
              savedBookId$,
              bookAttributesManager.bookTitle,
              bookAttributesManager.bookSynopsis
            );

          return (
            <div
              css={css`
                width: 100%;
              `}
            >
              <EuiCallOut
                size="s"
                color={'warning'}
                title={
                  savedBookId
                    ? i18n.translate('embeddableExamples.savedBook.libraryCallout', {
                        defaultMessage: 'Saved in library',
                      })
                    : i18n.translate('embeddableExamples.savedBook.noLibraryCallout', {
                        defaultMessage: 'Not saved in library',
                      })
                }
                iconType={savedBookId ? 'folderCheck' : 'folderClosed'}
              />
              <div
                css={css`
                  padding: ${euiThemeVars.euiSizeM};
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
