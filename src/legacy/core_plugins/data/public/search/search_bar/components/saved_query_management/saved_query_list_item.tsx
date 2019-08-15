/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiScreenReaderOnly,
  EuiIconTip,
  EuiToolTip,
} from '@elastic/eui';

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SavedQuery } from '../../index';

interface Props {
  savedQuery: SavedQuery;
  isSelected: boolean;
  showWriteOperations: boolean;
  onSelect: (savedQuery: SavedQuery) => void;
  onDelete: (savedQuery: SavedQuery) => void;
}

export const SavedQueryListItem = ({
  savedQuery,
  isSelected,
  onSelect,
  onDelete,
  showWriteOperations,
}: Props) => {
  const [showDeletionConfirmationModal, setShowDeletionConfirmationModal] = useState(false);

  const selectButtonAriaLabelText = isSelected
    ? i18n.translate(
        'data.search.searchBar.savedQueryPopoverSavedQueryListItemSelectedButtonAriaLabel',
        {
          defaultMessage:
            'Saved query button selected {savedQueryName}. Press to clear any changes.',
          values: { savedQueryName: savedQuery.attributes.title },
        }
      )
    : i18n.translate('data.search.searchBar.savedQueryPopoverSavedQueryListItemButtonAriaLabel', {
        defaultMessage: 'Saved query button {savedQueryName}',
        values: { savedQueryName: savedQuery.attributes.title },
      });

  const selectButtonDataTestSubj = isSelected
    ? `load-saved-query-${savedQuery.attributes.title}-button saved-query-list-item-selected`
    : `load-saved-query-${savedQuery.attributes.title}-button`;

  return (
    <Fragment>
      <li
        key={savedQuery.id}
        data-test-subj={`saved-query-list-item ${
          isSelected ? 'saved-query-list-item-selected' : ''
        }`}
      >
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => {
                onSelect(savedQuery);
              }}
              flush="left"
              data-test-subj={selectButtonDataTestSubj}
              textProps={isSelected ? { className: 'saved-query-list-item-text' } : undefined}
              aria-label={selectButtonAriaLabelText}
            >
              {savedQuery.attributes.title}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem>
                {savedQuery.attributes.description && (
                  <EuiIconTip
                    type="iInCircle"
                    content={savedQuery.attributes.description}
                    aria-label={i18n.translate(
                      'data.search.searchBar.savedQueryPopoverSavedQueryListItemDescriptionAriaLabel',
                      {
                        defaultMessage: '{savedQueryName} description',
                        values: { savedQueryName: savedQuery.attributes.title },
                      }
                    )}
                  />
                )}
              </EuiFlexItem>

              <EuiFlexItem>
                {showWriteOperations && (
                  <Fragment>
                    <EuiToolTip
                      position="top"
                      content={
                        <p>
                          {i18n.translate(
                            'data.search.searchBar.savedQueryPopoverDeleteButtonTooltip',
                            {
                              defaultMessage: 'Delete saved query',
                            }
                          )}
                        </p>
                      }
                    >
                      <EuiButtonEmpty
                        onClick={() => {
                          setShowDeletionConfirmationModal(true);
                        }}
                        iconType="trash"
                        color="danger"
                        aria-label={i18n.translate(
                          'data.search.searchBar.savedQueryPopoverDeleteButtonAriaLabel',
                          {
                            defaultMessage: 'Delete saved query {savedQueryName}',
                            values: { savedQueryName: savedQuery.attributes.title },
                          }
                        )}
                        data-test-subj={`delete-saved-query-${savedQuery.attributes.title}-button`}
                      />
                    </EuiToolTip>
                  </Fragment>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </li>

      {showDeletionConfirmationModal && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('data.search.searchBar.savedQueryPopoverConfirmDeletionTitle', {
              defaultMessage: 'Delete {savedQueryName}?',
              values: {
                savedQueryName: savedQuery.attributes.title,
              },
            })}
            confirmButtonText={i18n.translate(
              'data.search.searchBar.savedQueryPopoverConfirmDeletionConfirmButtonText',
              {
                defaultMessage: 'Delete',
              }
            )}
            cancelButtonText={i18n.translate(
              'data.search.searchBar.savedQueryPopoverConfirmDeletionCancelButtonText',
              {
                defaultMessage: 'Cancel',
              }
            )}
            onConfirm={() => {
              onDelete(savedQuery);
              setShowDeletionConfirmationModal(false);
            }}
            onCancel={() => {
              setShowDeletionConfirmationModal(false);
            }}
          />
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
