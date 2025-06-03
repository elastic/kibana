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
  EuiPopover,
  EuiPanel,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { i18n } from '@kbn/i18n';
import { tracksOverlays } from '@kbn/presentation-containers';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React, { useState } from 'react';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import { BookApi, BookAttributes } from './types';
import { saveBookAttributes } from './saved_book_library';
import { useBookAttributePublishingSubjects } from './use_book_attribute_publishing_subjects';
import { useBookSavedObjectTitle } from './use_book_savedobject_title';

export const openSavedBookEditor = ({
  attributesManager,
  isCreate,
  core,
  parent,
  api,
  contentManagement,
}: {
  attributesManager: StateManager<BookAttributes>;
  isCreate: boolean;
  core: CoreStart;
  parent?: unknown;
  api?: BookApi;
  contentManagement: ContentManagementPublicStart;
}): Promise<{ savedObjectId?: string }> => {
  return new Promise((resolve) => {
    const closeOverlay = (overlayRef: OverlayRef) => {
      if (tracksOverlays(parent)) parent.clearOverlays();
      overlayRef.close();
    };

    const initialState = attributesManager.getLatestState();
    const overlay = core.overlays.openFlyout(
      toMountPoint(
        <SavedBookEditor
          api={api}
          isCreate={isCreate}
          attributesManager={attributesManager}
          savedObjectServices={{
            contentClient: contentManagement.client,
            uiSettings: core.uiSettings,
          }}
          onCancel={() => {
            // set the state back to the initial state and reject
            attributesManager.reinitializeState(initialState);
            closeOverlay(overlay);
          }}
          onSubmit={async (addToLibrary: boolean) => {
            const savedObjectId = addToLibrary
              ? await saveBookAttributes(
                  contentManagement,
                  api?.getSavedBookId(),
                  attributesManager.getLatestState()
                )
              : undefined;
            closeOverlay(overlay);
            resolve({ savedObjectId });
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
  savedObjectServices,
}: {
  attributesManager: StateManager<BookAttributes>;
  isCreate: boolean;
  onSubmit: (addToLibrary: boolean) => Promise<void>;
  onCancel: () => void;
  api?: BookApi;
  savedObjectServices: {
    contentClient: ContentManagementPublicStart['client'];
    uiSettings: IUiSettingsClient;
  };
}) => {
  const {
    author,
    synopsis,
    title,
    pages,
    published = null,
    sequelTo = null,
  } = useBookAttributePublishingSubjects(attributesManager);

  const [addToLibrary, setAddToLibrary] = useState(Boolean(api?.getSavedBookId()));
  const [saving, setSaving] = useState(false);
  const [isSavedObjectFinderOpen, setIsSavedObjectFinderOpen] = useState(false);

  const sequelToTitle = useBookSavedObjectTitle(sequelTo, savedObjectServices.contentClient);

  const attributesManagerApi = attributesManager.api;

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
            value={author ?? ''}
            onChange={(e) => attributesManagerApi.setAuthor(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.titleLabel', {
            defaultMessage: 'Title',
          })}
        >
          <EuiFieldText
            disabled={saving}
            value={title ?? ''}
            onChange={(e) => attributesManagerApi.setBookTitle(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.pagesLabel', {
            defaultMessage: 'Number of pages',
          })}
        >
          <EuiFieldNumber
            disabled={saving}
            value={pages ?? ''}
            onChange={(e) => attributesManagerApi.setPages(+e.target.value)}
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
            onChange={(e) => attributesManagerApi.setSynopsis(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.publicationYearLabel', {
            defaultMessage: 'Year of publication',
          })}
        >
          <EuiFieldNumber
            disabled={saving}
            value={published ?? ''}
            onChange={(e) => attributesManagerApi.setPublished(+e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('embeddableExamples.savedBook.editor.sequelLabel', {
            defaultMessage: 'Sequel to',
          })}
        >
          <EuiPopover
            anchorPosition="leftCenter"
            isOpen={isSavedObjectFinderOpen}
            closePopover={() => setIsSavedObjectFinderOpen(false)}
            button={
              <EuiButton iconType="article" onClick={() => setIsSavedObjectFinderOpen(true)}>
                {sequelToTitle ??
                  i18n.translate('embeddableExamples.savedBook.editor.selectSequel', {
                    defaultMessage: 'Select book',
                  })}
              </EuiButton>
            }
          >
            <EuiPanel css={{ width: 400 }}>
              <SavedObjectFinder
                id="bookSequelFinder"
                onChoose={(id, _, __, { attributes }) => {
                  setIsSavedObjectFinderOpen(false);
                  attributesManagerApi.setSequelTo(id);
                }}
                showFilter={false}
                services={savedObjectServices}
                noItemsMessage={i18n.translate(
                  'embeddableExamples.savedBook.editor.savedObjectFinder.noMatchingObjectsMessage',
                  {
                    defaultMessage: 'No other books found.',
                  }
                )}
                savedObjectMetaData={[
                  {
                    type: 'book',
                    getIconForSavedObject: () => 'article',
                    name: i18n.translate(
                      'embeddableExamples.savedBook.editor.savedObjectFinder.bookSavedObjectTypeName',
                      {
                        defaultMessage: 'Book',
                      }
                    ),
                  },
                ]}
              />
            </EuiPanel>
          </EuiPopover>
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
