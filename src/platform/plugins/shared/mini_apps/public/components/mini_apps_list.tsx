/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiPageTemplate,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MiniApp } from '../../common';
import { useMiniAppsContext } from '../context';

export const MiniAppsList: React.FC = () => {
  const { apiClient, history, coreStart } = useMiniAppsContext();
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMiniApps = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.list();
      setMiniApps(response.items);
    } catch (error) {
      coreStart.notifications.toasts.addError(error as Error, {
        title: i18n.translate('miniApps.list.loadError', {
          defaultMessage: 'Failed to load mini apps',
        }),
      });
    } finally {
      setLoading(false);
    }
  }, [apiClient, coreStart.notifications.toasts]);

  useEffect(() => {
    loadMiniApps();
  }, [loadMiniApps]);

  const handleCreate = useCallback(() => {
    history.push('/create');
  }, [history]);

  const handleEdit = useCallback(
    (id: string) => {
      history.push(`/edit/${id}`);
    },
    [history]
  );

  const handleRun = useCallback(
    (id: string) => {
      history.push(`/run/${id}`);
    },
    [history]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      await apiClient.delete(deleteId);
      coreStart.notifications.toasts.addSuccess(
        i18n.translate('miniApps.list.deleteSuccess', {
          defaultMessage: 'Mini app deleted successfully',
        })
      );
      await loadMiniApps();
    } catch (error) {
      coreStart.notifications.toasts.addError(error as Error, {
        title: i18n.translate('miniApps.list.deleteError', {
          defaultMessage: 'Failed to delete mini app',
        }),
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }, [deleteId, apiClient, coreStart.notifications.toasts, loadMiniApps]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteId(null);
  }, []);

  const columns: Array<EuiBasicTableColumn<MiniApp>> = [
    {
      field: 'name',
      name: i18n.translate('miniApps.list.columns.name', { defaultMessage: 'Name' }),
      sortable: true,
      truncateText: true,
      render: (name: string, item: MiniApp) => (
        <EuiToolTip content={name}>
          <EuiButton
            onClick={() => handleRun(item.id)}
            color="text"
            style={{ fontWeight: 'normal' }}
          >
            {name}
          </EuiButton>
        </EuiToolTip>
      ),
    },
    {
      field: 'updated_at',
      name: i18n.translate('miniApps.list.columns.updatedAt', { defaultMessage: 'Last updated' }),
      sortable: true,
      render: (updatedAt: string) => {
        const date = new Date(updatedAt);
        return date.toLocaleString();
      },
    },
    {
      name: i18n.translate('miniApps.list.columns.actions', { defaultMessage: 'Actions' }),
      width: '150px',
      actions: [
        {
          name: i18n.translate('miniApps.list.actions.run', { defaultMessage: 'Run' }),
          description: i18n.translate('miniApps.list.actions.runDescription', {
            defaultMessage: 'Run this mini app',
          }),
          icon: 'play',
          type: 'icon',
          onClick: (item: MiniApp) => handleRun(item.id),
        },
        {
          name: i18n.translate('miniApps.list.actions.edit', { defaultMessage: 'Edit' }),
          description: i18n.translate('miniApps.list.actions.editDescription', {
            defaultMessage: 'Edit this mini app',
          }),
          icon: 'pencil',
          type: 'icon',
          onClick: (item: MiniApp) => handleEdit(item.id),
        },
        {
          name: i18n.translate('miniApps.list.actions.delete', { defaultMessage: 'Delete' }),
          description: i18n.translate('miniApps.list.actions.deleteDescription', {
            defaultMessage: 'Delete this mini app',
          }),
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (item: MiniApp) => handleDeleteClick(item.id),
        },
      ],
    },
  ];

  const emptyPrompt = (
    <EuiEmptyPrompt
      iconType="apps"
      title={
        <h2>
          <FormattedMessage id="miniApps.list.emptyTitle" defaultMessage="No mini apps yet" />
        </h2>
      }
      body={
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="miniApps.list.emptyDescription"
              defaultMessage="Create your first mini app to get started. Mini apps let you build custom interactive experiences using JavaScript."
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton fill iconType="plus" onClick={handleCreate}>
          <FormattedMessage id="miniApps.list.createButton" defaultMessage="Create mini app" />
        </EuiButton>
      }
    />
  );

  const miniAppToDelete = miniApps.find((app) => app.id === deleteId);

  return (
    <>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('miniApps.list.title', { defaultMessage: 'Mini Apps' })}
        rightSideItems={[
          <EuiButton key="create" fill iconType="plus" onClick={handleCreate}>
            <FormattedMessage id="miniApps.list.createButton" defaultMessage="Create mini app" />
          </EuiButton>,
        ]}
        description={i18n.translate('miniApps.list.description', {
          defaultMessage: 'Create and manage custom JavaScript-based mini applications',
        })}
      />
      <EuiPageTemplate.Section>
        {miniApps.length === 0 && !loading ? (
          emptyPrompt
        ) : (
          <EuiBasicTable<MiniApp>
            items={miniApps}
            columns={columns}
            loading={loading}
            rowHeader="name"
            tableLayout="auto"
          />
        )}
      </EuiPageTemplate.Section>

      {deleteId && miniAppToDelete && (
        <EuiConfirmModal
          title={i18n.translate('miniApps.list.deleteModalTitle', {
            defaultMessage: 'Delete mini app',
          })}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          confirmButtonText={i18n.translate('miniApps.list.deleteModalConfirm', {
            defaultMessage: 'Delete',
          })}
          cancelButtonText={i18n.translate('miniApps.list.deleteModalCancel', {
            defaultMessage: 'Cancel',
          })}
          buttonColor="danger"
          isLoading={deleting}
        >
          <FormattedMessage
            id="miniApps.list.deleteModalBody"
            defaultMessage='Are you sure you want to delete "{name}"? This action cannot be undone.'
            values={{ name: miniAppToDelete.name }}
          />
        </EuiConfirmModal>
      )}
    </>
  );
};
