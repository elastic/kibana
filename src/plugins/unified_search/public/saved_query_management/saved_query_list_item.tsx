/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItem, EuiConfirmModal, EuiIconTip } from '@elastic/eui';

import React, { Fragment, useState } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { SavedQuery } from '@kbn/data-plugin/public';

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
        'unifiedSearch.search.searchBar.savedQueryPopoverSavedQueryListItemSelectedButtonAriaLabel',
        {
          defaultMessage:
            'Saved query button selected {savedQueryName}. Press to clear any changes.',
          values: { savedQueryName: savedQuery.attributes.title },
        }
      )
    : i18n.translate(
        'unifiedSearch.search.searchBar.savedQueryPopoverSavedQueryListItemButtonAriaLabel',
        {
          defaultMessage: 'Saved query button {savedQueryName}',
          values: { savedQueryName: savedQuery.attributes.title },
        }
      );

  const selectButtonDataTestSubj = isSelected
    ? `load-saved-query-${savedQuery.attributes.title}-button saved-query-list-item-selected`
    : `load-saved-query-${savedQuery.attributes.title}-button`;

  const classes = classNames('kbnSavedQueryListItem', {
    'kbnSavedQueryListItem-selected': isSelected,
  });

  const label = (
    <span className="kbnSavedQueryListItem__label">
      <span className="kbnSavedQueryListItem__labelText">{savedQuery.attributes.title}</span>{' '}
      {savedQuery.attributes.description && (
        <EuiIconTip
          type="iInCircle"
          content={savedQuery.attributes.description}
          aria-label={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverSavedQueryListItemDescriptionAriaLabel',
            {
              defaultMessage: '{savedQueryName} description',
              values: { savedQueryName: savedQuery.attributes.title },
            }
          )}
        />
      )}
    </span>
  );

  return (
    <Fragment>
      <EuiListGroupItem
        className={classes}
        key={savedQuery.id}
        data-test-subj={`saved-query-list-item ${selectButtonDataTestSubj} ${
          isSelected ? 'saved-query-list-item-selected' : ''
        }`}
        isActive={isSelected}
        onClick={() => {
          onSelect(savedQuery);
        }}
        aria-label={selectButtonAriaLabelText}
        label={label}
        iconType={isSelected ? 'check' : undefined}
        extraAction={
          showWriteOperations
            ? {
                color: 'danger',
                onClick: () => setShowDeletionConfirmationModal(true),
                iconType: 'trash',
                iconSize: 's',
                'aria-label': i18n.translate(
                  'unifiedSearch.search.searchBar.savedQueryPopoverDeleteButtonAriaLabel',
                  {
                    defaultMessage: 'Delete saved query {savedQueryName}',
                    values: { savedQueryName: savedQuery.attributes.title },
                  }
                ),
                title: i18n.translate(
                  'unifiedSearch.search.searchBar.savedQueryPopoverDeleteButtonAriaLabel',
                  {
                    defaultMessage: 'Delete saved query {savedQueryName}',
                    values: { savedQueryName: savedQuery.attributes.title },
                  }
                ),
                'data-test-subj': `delete-saved-query-${savedQuery.attributes.title}-button`,
              }
            : undefined
        }
      />

      {showDeletionConfirmationModal && (
        <EuiConfirmModal
          title={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionTitle',
            {
              defaultMessage: 'Delete "{savedQueryName}"?',
              values: {
                savedQueryName: savedQuery.attributes.title,
              },
            }
          )}
          confirmButtonText={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionConfirmButtonText',
            {
              defaultMessage: 'Delete',
            }
          )}
          cancelButtonText={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionCancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          onConfirm={() => {
            onDelete(savedQuery);
            setShowDeletionConfirmationModal(false);
          }}
          buttonColor="danger"
          onCancel={() => {
            setShowDeletionConfirmationModal(false);
          }}
        />
      )}
    </Fragment>
  );
};
