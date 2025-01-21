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
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasUniqueId, useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React, { useState } from 'react';
import { serializeBookAttributes } from './book_state';
import { BookApi, BookAttributesManager } from './types';
import { saveBookAttributes } from './saved_book_library';

export const openSavedBookEditor = ({
  attributesManager,
  isCreate,
  core,
  parent,
  api,
}: {
  attributesManager: BookAttributesManager;
  isCreate: boolean;
  core: CoreStart;
  parent?: unknown;
  api?: BookApi;
}): Promise<{ savedBookId?: string }> => {
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (tracksOverlays(parent)) parent.clearOverlays();
      overlayRef.close();
    };

    const initialState = serializeBookAttributes(attributesManager);
    const overlay = core.overlays.openFlyout(
      toMountPoint(
        <SavedBookEditor
          api={api}
          isCreate={isCreate}
          attributesManager={attributesManager}
          onCancel={() => {
            // set the state back to the initial state and reject
            attributesManager.authorName.next(initialState.authorName);
            attributesManager.bookSynopsis.next(initialState.bookSynopsis);
            attributesManager.bookTitle.next(initialState.bookTitle);
            attributesManager.numberOfPages.next(initialState.numberOfPages);
            closeOverlay(overlay);
          }}
          onSubmit={async (addToLibrary: boolean) => {
            const savedBookId = addToLibrary
              ? await saveBookAttributes(
                  api?.getSavedBookId(),
                  serializeBookAttributes(attributesManager)
                )
              : undefined;

            closeOverlay(overlay);
            resolve({ savedBookId });
          }}
        />,
        core
      ),
      {
        type: isCreate ? 'overlay' : 'push',
        size: 'm',
        onClose: () => closeOverlay(overlay),
      }
    );

    const overlayOptions = !isCreate && apiHasUniqueId(api) ? { focusedPanelId: api.uuid } : {};
    /**
     * if our parent needs to know about the overlay, notify it. This allows the parent to close the overlay
     * when navigating away, or change certain behaviors based on the overlay being open.
     */
    if (tracksOverlays(parent)) parent.openOverlay(overlay, overlayOptions);
  });
};

export const SavedBookEditor = ({
  attributesManager,
  isCreate,
  onSubmit,
  onCancel,
  api,
}: {
  attributesManager: BookAttributesManager;
  isCreate: boolean;
  onSubmit: (addToLibrary: boolean) => Promise<void>;
  onCancel: () => void;
  api?: BookApi;
}) => {
  const [authorName, synopsis, bookTitle, numberOfPages] = useBatchedOptionalPublishingSubjects(
    attributesManager.authorName,
    attributesManager.bookSynopsis,
    attributesManager.bookTitle,
    attributesManager.numberOfPages
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
            onChange={(e) => attributesManager.authorName.next(e.target.value)}
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
            onChange={(e) => attributesManager.bookTitle.next(e.target.value)}
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
            onChange={(e) => attributesManager.numberOfPages.next(+e.target.value)}
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
            onChange={(e) => attributesManager.bookSynopsis.next(e.target.value)}
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
