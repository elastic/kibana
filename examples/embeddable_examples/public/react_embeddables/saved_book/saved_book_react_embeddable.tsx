/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { initializeTitles, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { SAVED_BOOK_ID } from './constants';
import {
  BookApi,
  BookAttributes,
  BookByReferenceSerializedState,
  BookByValueSerializedState,
  BookRuntimeState,
  BookSerializedState,
} from './types';

const storage = new Storage(localStorage);

const bookSerializedStateIsByReference = (
  state?: BookSerializedState
): state is BookByReferenceSerializedState => {
  return Boolean(state && (state as BookByReferenceSerializedState).savedBookId !== undefined);
};

const loadSavedBook = async (id: string) => {
  await new Promise((r) => setTimeout(r, 1000)); // simulate load from network.
  const attributes = storage.get(id) as BookAttributes;
  return {
    // if the external state came with references, you could return those directly here.
    rawState: attributes,
  };
};

export const savedBookEmbeddableFactory: ReactEmbeddableFactory<
  BookSerializedState,
  BookApi,
  BookRuntimeState,
  BookAttributes
> = {
  type: SAVED_BOOK_ID,
  loadExternalState: async (state) => {
    if (!bookSerializedStateIsByReference(state.rawState)) {
      // if the state is by value, we can return it directly. No need to load anything.
      return {
        rawState: state.rawState?.attributes,
      };
    }
    return loadSavedBook(state.rawState.savedBookId);
  },
  deserializeState: (serializedState, externalState) => {
    // here we can assert that the external state is not undefined, because we know that
    // we should have the full state by now either from the parent (by value) or from the
    // external store (by reference).
    if (!externalState) {
      throw new Error(
        i18n.translate('embeddableExamples.savedBook.externalStateMissing', {
          defaultMessage: 'External state missing for saved book embeddable.',
        })
      );
    }
    // here we combine the serialized state from the parent with the state from the
    // external store to build our runtime state.
    return {
      ...externalState.rawState,
      ...serializedState.rawState,
    };
  },
  buildEmbeddable: async (state, buildApi) => {
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

    const defaultPanelTitle$ = new BehaviorSubject<string | undefined>(state.bookTitle);
    const defaultPanelDescription$ = new BehaviorSubject(state.bookDescription);

    const authorName$ = new BehaviorSubject(state.authorName);
    const numberOfPages$ = new BehaviorSubject(state.numberOfPages);
    const savedBookId$ = new BehaviorSubject(state.savedBookId);
    const bookTitle$ = new BehaviorSubject(state.bookTitle);

    const getBookAttributes = (): BookAttributes => ({
      authorName: authorName$.value,
      numberOfPages: numberOfPages$.value,
      bookTitle: bookTitle$.value,
    });

    const api = buildApi(
      {
        ...titlesApi,
        defaultPanelTitle: defaultPanelTitle$,
        defaultPanelDescription: defaultPanelDescription$,
        serializeState: () => {
          if (savedBookId$.value === undefined) {
            // if this book is currently by value, we serialize the entire state.
            const bookByValueState: BookByValueSerializedState = {
              attributes: getBookAttributes(),
              ...serializeTitles(),
            };
            return { rawState: bookByValueState };
          }
          // if this book is currently by reference, we only need to serialize the reference.
          const bookByReferenceState: BookByReferenceSerializedState = {
            savedBookId: savedBookId$.value,
            ...serializeTitles(),
          };
          return { rawState: bookByReferenceState };
        },
        saveExternalState: async () => {
          // we can early return out of this function if the savedBookId is undefined.
          if (savedBookId$.value === undefined) return;

          const bookAttributes = getBookAttributes();
          // if we are currently by reference, save to the library

          await new Promise((r) => setTimeout(r, 1000)); // simulate save to network.
          storage.set(savedBookId$.value, bookAttributes);
        },
      },
      {
        bookTitle: [bookTitle$, (val) => bookTitle$.next(val)],
        authorName: [authorName$, (val) => authorName$.next(val)],
        savedBookId: [savedBookId$, (val) => savedBookId$.next(val)],
        numberOfPages: [numberOfPages$, (val) => numberOfPages$.next(val)],
        bookDescription: [defaultPanelDescription$, (val) => defaultPanelDescription$.next(val)],
        ...titleComparators,
      }
    );

    return {
      api,
      Component: () => {
        const [authorName, numberOfPages, savedBookId, bookTitle] = useBatchedPublishingSubjects(
          authorName$,
          numberOfPages$,
          savedBookId$,
          bookTitle$
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
              <EuiFlexGroup direction="column" justifyContent="flexStart" alignItems="stretch">
                <EuiFlexItem>
                  <EuiTitle size="m">
                    <EuiText>{bookTitle}</EuiText>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup wrap responsive={false} gutterSize="xs">
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
              </EuiFlexGroup>
            </div>
          </div>
        );
      },
    };
  },
};
