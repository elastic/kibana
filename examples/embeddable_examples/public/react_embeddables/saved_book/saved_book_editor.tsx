/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useState } from 'react';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { i18n } from '@kbn/i18n';
import { BookApi, BookAttributes } from './types';
import { saveBookAttributes } from './saved_book_library';

export const getSavedBookEditor = ({
  attributesManager,
  isCreate,
  api,
  closeFlyout,
  onSubmit,
}: {
  attributesManager: StateManager<BookAttributes>;
  isCreate: boolean;
  api?: BookApi;
  closeFlyout: () => void;
  onSubmit: (result: { savedBookId?: string }) => void;
}) => {
  const initialState = attributesManager.getLatestState();
  return (
    <SavedBookEditor
      api={api}
      isCreate={isCreate}
      attributesManager={attributesManager}
      onCancel={() => {
        // set the state back to the initial state and reject
        attributesManager.reinitializeState(initialState);
        closeFlyout();
      }}
      onSubmit={async (addToLibrary: boolean) => {
        const savedBookId = addToLibrary
          ? await saveBookAttributes(api?.getSavedBookId(), attributesManager.getLatestState())
          : undefined;

        closeFlyout();
        onSubmit({ savedBookId });
      }}
    />
  );
};

export const SavedBookEditor = ({
  attributesManager,
  isCreate,
  onSubmit,
  onCancel,
  api,
}: {
  attributesManager: StateManager<BookAttributes>;
  isCreate: boolean;
  onSubmit: (addToLibrary: boolean) => Promise<void>;
  onCancel: () => void;
  api?: BookApi;
}) => {
  const [authorName, synopsis, bookTitle, numberOfPages] = useBatchedPublishingSubjects(
    attributesManager.api.authorName$,
    attributesManager.api.bookSynopsis$,
    attributesManager.api.bookTitle$,
    attributesManager.api.numberOfPages$
  );
  const [addToLibrary, setAddToLibrary] = useState(Boolean(api?.getSavedBookId()));
  const [saving, setSaving] = useState(false);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isCreate
              ? i18n.translate('embeddableExamples.savedBook.editor.newTitle', {
                  defaultMessage: 'Create new book',
                })
              : i18n.translate('embeddableExamples.savedBook.editor.editTitle', {
                  defaultMessage: 'Edit book',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.authorLabel', {
            defaultMessage: 'Author',
          })}
        >
          <EuiFieldText
            disabled={saving}
            value={authorName ?? ''}
            onChange={(e) => attributesManager.api.setAuthorName(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.titleLabel', {
            defaultMessage: 'Title',
          })}
        >
          <EuiFieldText
            disabled={saving}
            value={bookTitle ?? ''}
            onChange={(e) => attributesManager.api.setBookTitle(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.pagesLabel', {
            defaultMessage: 'Number of pages',
          })}
        >
          <EuiFieldNumber
            disabled={saving}
            value={numberOfPages ?? ''}
            onChange={(e) => attributesManager.api.setNumberOfPages(+e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.synopsisLabel', {
            defaultMessage: 'Synopsis',
          })}
        >
          <EuiTextArea
            disabled={saving}
            value={synopsis ?? ''}
            onChange={(e) => attributesManager.api.setBookSynopsis(e.target.value)}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty disabled={saving} iconType="cross" onClick={onCancel} flush="left">
              {i18n.translate('embeddableExamples.savedBook.editor.cancel', {
                defaultMessage: 'Discard changes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={i18n.translate('embeddableExamples.savedBook.editor.addToLibrary', {
                    defaultMessage: 'Save to library',
                  })}
                  checked={addToLibrary}
                  disabled={saving}
                  onChange={() => setAddToLibrary(!addToLibrary)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={saving}
                  onClick={() => {
                    setSaving(true);
                    onSubmit(addToLibrary);
                  }}
                  fill
                >
                  {isCreate
                    ? i18n.translate('embeddableExamples.savedBook.editor.create', {
                        defaultMessage: 'Create book',
                      })
                    : i18n.translate('embeddableExamples.savedBook.editor.save', {
                        defaultMessage: 'Keep changes',
                      })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
