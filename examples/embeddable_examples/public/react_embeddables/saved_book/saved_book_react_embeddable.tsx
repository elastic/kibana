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
import { EmbeddableFactory, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasParentApi,
  initializeTitleManager,
  SerializedTitles,
  SerializedPanelState,
  useBatchedPublishingSubjects,
  initializeStateManager,
  titleComparators,
  StateComparators,
} from '@kbn/presentation-publishing';
import React from 'react';
import { PresentationContainer, apiIsPresentationContainer } from '@kbn/presentation-containers';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { merge } from 'rxjs';
import { defaultBookAttributes } from './book_state';
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
import { PageApi } from '../../app/presentation_container_example/types';

const bookSerializedStateIsByReference = (
  state?: BookSerializedState
): state is BookByReferenceSerializedState => {
  return Boolean(state && (state as BookByReferenceSerializedState).savedObjectId);
};

const bookAttributeComparators: StateComparators<BookAttributes> = {
  bookTitle: 'referenceEquality',
  authorName: 'referenceEquality',
  bookSynopsis: 'referenceEquality',
  numberOfPages: 'referenceEquality',
};

const deserializeState = async (
  serializedState: SerializedPanelState<BookSerializedState>,
  embeddable: EmbeddableStart
): Promise<BookRuntimeState> => {
  // panel state is always stored with the parent.
  const titlesState: SerializedTitles = {
    title: serializedState.rawState.title,
    hidePanelTitles: serializedState.rawState.hidePanelTitles,
    description: serializedState.rawState.description,
  };

  const savedObjectId = bookSerializedStateIsByReference(serializedState.rawState)
    ? serializedState.rawState.savedObjectId
    : undefined;

  const attributes: BookAttributes = bookSerializedStateIsByReference(serializedState.rawState)
    ? await loadBookAttributes(embeddable, serializedState.rawState.savedObjectId)!
    : serializedState.rawState.attributes;

  // Combine the serialized state from the parent with the state from the
  // external store to build runtime state.
  return {
    ...titlesState,
    ...attributes,
    savedObjectId,
  };
};

export const getSavedBookEmbeddableFactory = (core: CoreStart, embeddable: EmbeddableStart) => {
  const savedBookEmbeddableFactory: EmbeddableFactory<BookSerializedState, BookApi> = {
    type: SAVED_BOOK_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const state = await deserializeState(initialState, embeddable);
      const titleManager = initializeTitleManager(initialState.rawState);
      const bookAttributesManager = initializeStateManager<BookAttributes>(
        state,
        defaultBookAttributes
      );
      const isByReference = Boolean(state.savedObjectId);

      const serializeBook = (byReference: boolean, newId?: string) => {
        if (byReference) {
          // if this book is currently by reference, we serialize the reference only.
          const bookByReferenceState: BookByReferenceSerializedState = {
            savedObjectId: newId ?? state.savedObjectId!,
            ...titleManager.getLatestState(),
          };
          return { rawState: bookByReferenceState };
        }
        // if this book is currently by value, we serialize the entire state.
        const bookByValueState: BookByValueSerializedState = {
          ...titleManager.getLatestState(),
          attributes: bookAttributesManager.getLatestState(),
        };
        return { rawState: bookByValueState };
      };

      const serializeState = () => serializeBook(isByReference);

      const unsavedChangesApi = initializeUnsavedChanges<BookSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, bookAttributesManager.anyStateChange$),
        getComparators: () => {
          return {
            ...titleComparators,
            ...bookAttributeComparators,
            savedObjectId: 'skip', // saved book id will not change over the lifetime of the embeddable.
          };
        },
        onReset: async (lastSaved) => {
          const lastRuntimeState = lastSaved ? await deserializeState(lastSaved, embeddable) : {};
          titleManager.reinitializeState(lastRuntimeState);
          bookAttributesManager.reinitializeState(lastRuntimeState);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        onEdit: async () => {
          openSavedBookEditor({
            attributesManager: bookAttributesManager,
            parent: api.parentApi,
            isCreate: false,
            core,
            api,
            embeddable,
          }).then((result) => {
            const nextIsByReference = Boolean(result.savedObjectId);

            // if the by reference state has changed during this edit, reinitialize the panel.
            if (nextIsByReference !== isByReference && apiIsPresentationContainer(api.parentApi)) {
              api.parentApi.replacePanel<BookSerializedState>(api.uuid, {
                serializedState: serializeBook(nextIsByReference, result.savedObjectId),
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
        serializeState,

        // library transforms
        getSavedBookId: () => state.savedObjectId,
        saveToLibrary: async (newTitle: string) => {
          bookAttributesManager.api.setBookTitle(newTitle);
          const newId = await saveBookAttributes(
            embeddable,
            undefined,
            bookAttributesManager.getLatestState()
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
      });

      const showLibraryCallout =
        apiHasParentApi(api) &&
        typeof (api.parentApi as PresentationContainer)?.replacePanel === 'function';

      const embeddableVersion =
        (apiHasParentApi(api) &&
          (api.parentApi as PageApi)?.getVersionForPanelType?.(SAVED_BOOK_ID)) ??
        1;

      return {
        api,
        Component: () => {
          const [authorName, numberOfPages, bookTitle, synopsis] = useBatchedPublishingSubjects(
            bookAttributesManager.api.authorName$,
            bookAttributesManager.api.numberOfPages$,
            bookAttributesManager.api.bookTitle$,
            bookAttributesManager.api.bookSynopsis$
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
