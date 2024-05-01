/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  EuiFormControlLayout,
  EuiFormRow,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import {
  apiHasParentApi,
  apiHasUniqueId,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { serializeBookAttributes } from './book_state';
import { BookAttributesManager } from './types';

export const openSavedBookEditor = (
  attributesManager: BookAttributesManager,
  isCreate: boolean,
  core: CoreStart,
  api: unknown
): Promise<void> => {
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (apiHasParentApi(api) && tracksOverlays(api.parentApi)) {
        api.parentApi.clearOverlays();
      }
      overlayRef.close();
    };

    const initialState = serializeBookAttributes(attributesManager);
    const overlay = core.overlays.openFlyout(
      toMountPoint(
        <SavedBookEditor
          attributesManager={attributesManager}
          isCreate={isCreate}
          onCancel={() => {
            // set the state back to the initial state and reject
            attributesManager.authorName.next(initialState.authorName);
            attributesManager.bookDescription.next(initialState.bookDescription);
            attributesManager.bookTitle.next(initialState.bookTitle);
            attributesManager.numberOfPages.next(initialState.numberOfPages);
            closeOverlay(overlay);
          }}
          onSubmit={() => {
            closeOverlay(overlay);
            resolve();
          }}
        />,
        {
          theme: core.theme,
          i18n: core.i18n,
        }
      ),
      { type: isCreate ? 'overlay' : 'push', size: 's', onClose: () => closeOverlay(overlay) }
    );

    const overlayOptions = !isCreate && apiHasUniqueId(api) ? { focusedPanelId: api.uuid } : {};
    if (apiHasParentApi(api) && tracksOverlays(api.parentApi)) {
      api.parentApi.openOverlay(overlay, overlayOptions);
    }
  });
};

export const SavedBookEditor = ({
  attributesManager,
  isCreate,
  onSubmit,
  onCancel,
}: {
  attributesManager: BookAttributesManager;
  isCreate: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) => {
  const [authorName, bookDescription, bookTitle, numberOfPages] =
    useBatchedOptionalPublishingSubjects(
      attributesManager.authorName,
      attributesManager.bookDescription,
      attributesManager.bookTitle,
      attributesManager.numberOfPages
    );

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
        <EuiFormControlLayout>
          <EuiFormRow
            label={i18n.translate('embeddableExamples.savedBook.editor.authorLabel', {
              defaultMessage: 'Author',
            })}
          >
            <EuiFieldText
              value={authorName}
              onChange={(e) => attributesManager.authorName.next(e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('embeddableExamples.savedBook.editor.titleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              value={bookTitle}
              onChange={(e) => attributesManager.bookTitle.next(e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('embeddableExamples.savedBook.editor.pagesLabel', {
              defaultMessage: 'Number of pages',
            })}
          >
            <EuiFieldNumber
              value={numberOfPages}
              onChange={(e) => attributesManager.numberOfPages.next(+e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('embeddableExamples.savedBook.editor.descriptionLabel', {
              defaultMessage: 'Book description',
            })}
          >
            <EuiTextArea
              value={bookDescription}
              onChange={(e) => attributesManager.bookDescription.next(e.target.value)}
            />
          </EuiFormRow>
        </EuiFormControlLayout>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onCancel} flush="left">
              {i18n.translate('embeddableExamples.savedBook.editor.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSubmit} fill>
              {i18n.translate('embeddableExamples.savedBook.editor.save', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
