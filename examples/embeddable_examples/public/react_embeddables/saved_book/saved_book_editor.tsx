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
  EuiSwitch,
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
): Promise<{ addToLibrary: boolean }> => {
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
            attributesManager.bookSynopsis.next(initialState.bookSynopsis);
            attributesManager.bookTitle.next(initialState.bookTitle);
            attributesManager.numberOfPages.next(initialState.numberOfPages);
            closeOverlay(overlay);
          }}
          onSubmit={(addToLibrary: boolean) => {
            closeOverlay(overlay);
            resolve({ addToLibrary });
          }}
        />,
        {
          theme: core.theme,
          i18n: core.i18n,
        }
      ),
      {
        type: isCreate ? 'overlay' : 'push',
        size: isCreate ? 'm' : 's',
        onClose: () => closeOverlay(overlay),
      }
    );

    const overlayOptions = !isCreate && apiHasUniqueId(api) ? { focusedPanelId: api.uuid } : {};
    /**
     * if our parent needs to know about the overlay, notify it. This allows the parent to close the overlay
     * when navigating away, or change certain behaviors based on the overlay being open.
     */
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
  onSubmit: (addToLibrary: boolean) => void;
  onCancel: () => void;
}) => {
  const [addToLibrary, setAddToLibrary] = React.useState(false);
  const [authorName, synopsis, bookTitle, numberOfPages] = useBatchedOptionalPublishingSubjects(
    attributesManager.authorName,
    attributesManager.bookSynopsis,
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
            label={i18n.translate('embeddableExamples.savedBook.editor.synopsisLabel', {
              defaultMessage: 'Synopsis',
            })}
          >
            <EuiTextArea
              value={synopsis}
              onChange={(e) => attributesManager.bookSynopsis.next(e.target.value)}
            />
          </EuiFormRow>
        </EuiFormControlLayout>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onCancel} flush="left">
              {i18n.translate('embeddableExamples.savedBook.editor.cancel', {
                defaultMessage: 'Discard changes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {isCreate && (
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={i18n.translate('embeddableExamples.savedBook.editor.addToLibrary', {
                      defaultMessage: 'Save to library',
                    })}
                    checked={addToLibrary}
                    onChange={() => setAddToLibrary(!addToLibrary)}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => onSubmit(addToLibrary)} fill>
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
