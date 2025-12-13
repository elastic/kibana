/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiFieldSearch,
  EuiSpacer,
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  EuiConfirmModal,
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSavedSnippets, useDeleteSnippet } from '../../hooks/use_saved_snippets';
import { useServicesContext } from '../../contexts';
import type { SavedSnippet } from '../../../services';

interface Props {
  onLoadSnippet: (snippet: SavedSnippet) => void;
  onSaveSnippet: () => void;
}

export const SnippetsSidebar: React.FC<Props> = ({ onLoadSnippet, onSaveSnippet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedSnippet | null>(null);
  const { data, isLoading, error } = useSavedSnippets(searchTerm);
  const deleteSnippet = useDeleteSnippet();
  const {
    services: { notifications },
  } = useServicesContext();

  const handleDelete = async () => {
    if (deleteTarget?.id) {
      try {
        await deleteSnippet.mutateAsync(deleteTarget.id);
        notifications.toasts.addSuccess(
          i18n.translate('console.snippets.sidebar.deleteSuccessMessage', {
            defaultMessage: 'Snippet "{title}" deleted successfully',
            values: { title: deleteTarget.title },
          })
        );
        setDeleteTarget(null);
      } catch (err) {
        notifications.toasts.addDanger(
          i18n.translate('console.snippets.sidebar.deleteErrorMessage', {
            defaultMessage: 'Failed to delete snippet',
          })
        );
      }
    }
  };

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiText size="s">
        <h3>
          <FormattedMessage
            id="console.snippets.sidebar.title"
            defaultMessage="Saved snippets"
          />
        </h3>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFieldSearch
        placeholder={i18n.translate('console.snippets.sidebar.searchPlaceholder', {
          defaultMessage: 'Search snippets',
        })}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        compressed
        fullWidth
        isClearable
        data-test-subj="consoleSnippetSearch"
      />
      <EuiSpacer size="m" />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <EuiLoadingSpinner size="m" />
        </div>
      ) : error ? (
        <EuiCallOut
          title={i18n.translate('console.snippets.sidebar.errorTitle', {
            defaultMessage: 'Error loading snippets',
          })}
          color="danger"
          iconType="error"
          size="s"
        >
          <p>
            {error instanceof Error
              ? error.message
              : i18n.translate('console.snippets.sidebar.genericError', {
                  defaultMessage: 'An unexpected error occurred',
                })}
          </p>
        </EuiCallOut>
      ) : !data?.snippets.length ? (
        <EuiEmptyPrompt
          iconType="documents"
          title={
            <h4>
              {searchTerm ? (
                <FormattedMessage
                  id="console.snippets.sidebar.noResultsTitle"
                  defaultMessage="No matching snippets"
                />
              ) : (
                <FormattedMessage
                  id="console.snippets.sidebar.emptyTitle"
                  defaultMessage="No saved snippets"
                />
              )}
            </h4>
          }
          body={
            <p>
              {searchTerm ? (
                <FormattedMessage
                  id="console.snippets.sidebar.noResultsBody"
                  defaultMessage="Try a different search term"
                />
              ) : (
                <FormattedMessage
                  id="console.snippets.sidebar.emptyBody"
                  defaultMessage="Save your first snippet using the button below"
                />
              )}
            </p>
          }
          titleSize="xs"
        />
      ) : (
        <EuiListGroup
          flush
          bordered
          maxWidth={false}
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        >
          {data.snippets.map((snippet) => (
            <EuiListGroupItem
              key={snippet.id}
              label={snippet.title}
              onClick={() => onLoadSnippet(snippet)}
              extraAction={{
                iconType: 'trash',
                'aria-label': i18n.translate('console.snippets.sidebar.deleteButtonLabel', {
                  defaultMessage: 'Delete snippet {title}',
                  values: { title: snippet.title },
                }),
                onClick: () => setDeleteTarget(snippet),
                'data-test-subj': `consoleSnippetDelete-${snippet.id}`,
              }}
              data-test-subj={`consoleSnippetItem-${snippet.id}`}
              iconType="document"
            />
          ))}
        </EuiListGroup>
      )}

      <EuiSpacer size="m" />
      <EuiButton
        fill
        fullWidth
        onClick={onSaveSnippet}
        iconType="save"
        data-test-subj="consoleSaveSnippetButton"
      >
        <FormattedMessage
          id="console.snippets.sidebar.saveButton"
          defaultMessage="Save current query"
        />
      </EuiButton>

      {deleteTarget && (
        <EuiConfirmModal
          title={i18n.translate('console.snippets.sidebar.deleteModalTitle', {
            defaultMessage: 'Delete snippet?',
          })}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate('console.snippets.sidebar.deleteModalCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('console.snippets.sidebar.deleteModalConfirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="consoleSnippetDeleteModal"
        >
          <p>
            <FormattedMessage
              id="console.snippets.sidebar.deleteModalBody"
              defaultMessage='Are you sure you want to delete "{title}"? This action cannot be undone.'
              values={{ title: deleteTarget.title }}
            />
          </p>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};
