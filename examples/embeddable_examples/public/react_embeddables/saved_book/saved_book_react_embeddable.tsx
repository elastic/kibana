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
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasParentApi,
  getUnchangingComparator,
  initializeTitleManager,
  SerializedTitles,
  SerializedPanelState,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React from 'react';
import { PresentationContainer } from '@kbn/presentation-containers';
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
      const titleManager = initializeTitleManager(state);
      const bookAttributesManager = stateManagerFromAttributes(state);
      const isByReference = Boolean(state.savedBookId);

      const serializeBook = (byReference: boolean, newId?: string) => {
        if (byReference) {
          // if this book is currently by reference, we serialize the reference only.
          const bookByReferenceState: BookByReferenceSerializedState = {
            savedBookId: newId ?? state.savedBookId!,
            ...titleManager.serialize(),
          };
          return { rawState: bookByReferenceState };
        }
        // if this book is currently by value, we serialize the entire state.
        const bookByValueState: BookByValueSerializedState = {
          attributes: serializeBookAttributes(bookAttributesManager),
          ...titleManager.serialize(),
        };
        return { rawState: bookByValueState };
      };

      const api = buildApi(
        {
          ...titleManager.api,
          onEdit: async () => {
            openSavedBookEditor({
              attributesManager: bookAttributesManager,
              parent: api.parentApi,
              isCreate: false,
              core,
              api,
            }).then((result) => {
              const nextIsByReference = Boolean(result.savedBookId);

              // if the by reference state has changed during this edit, reinitialize the panel.
              if (nextIsByReference !== isByReference) {
                api.parentApi?.replacePanel<BookSerializedState>(api.uuid, {
                  serializedState: serializeBook(nextIsByReference, result.savedBookId),
                  panelType: api.type,
                });
              }
            });
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('embeddableExamples.savedbook.editBook.displayName', {
              defaultMessage: 'book',
            }),
          serializeState: () => serializeBook(isByReference),

          // library transforms
          getSavedBookId: () => state.savedBookId,
          saveToLibrary: async (newTitle: string) => {
            bookAttributesManager.bookTitle.next(newTitle);
            const newId = await saveBookAttributes(
              undefined,
              serializeBookAttributes(bookAttributesManager)
            );
            return newId;
          },
          checkForDuplicateTitle: async (title) => {},
          getSerializedStateByValue: () =>
            serializeBook(false) as SerializedPanelState<BookByValueSerializedState>,
          getSerializedStateByReference: (newId) =>
            serializeBook(true, newId) as SerializedPanelState<BookByReferenceSerializedState>,
          canLinkToLibrary: async () => !isByReference,
          canUnlinkFromLibrary: async () => isByReference,
        },
        {
          savedBookId: getUnchangingComparator(), // saved book id will not change over the lifetime of the embeddable.
          ...bookAttributesManager.comparators,
          ...titleManager.comparators,
        }
      );

      const showLibraryCallout =
        apiHasParentApi(api) &&
        typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function';

      return {
        api,
        Component: () => {
          const [authorName, numberOfPages, bookTitle, synopsis] = useBatchedPublishingSubjects(
            bookAttributesManager.authorName,
            bookAttributesManager.numberOfPages,
            bookAttributesManager.bookTitle,
            bookAttributesManager.bookSynopsis
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
