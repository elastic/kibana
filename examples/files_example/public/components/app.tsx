/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FilesClientResponses } from '@kbn/files-plugin/public';

import {
  EuiProvider,
  EuiPageTemplate,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiLink,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { MyFilePicker } from './file_picker';
import type { MyImageMetadata } from '../../common';
import type { FileClients } from '../types';
import { DetailsFlyout } from './details_flyout';
import { ConfirmButtonIcon } from './confirm_button';
import { Modal } from './modal';

interface FilesExampleAppDeps {
  files: FileClients;
  notifications: CoreStart['notifications'];
}

type ListResponse = FilesClientResponses<MyImageMetadata>['list'];

export const FilesExampleApp = ({ files, notifications }: FilesExampleAppDeps) => {
  const { data, isLoading, error, refetch } = useQuery<ListResponse>(
    ['files'],
    () => files.example.list(),
    { refetchOnWindowFocus: false }
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<undefined | FileJSON<MyImageMetadata>>();

  const renderToolsRight = () => {
    return [
      <EuiButton
        onClick={() => setShowFilePickerModal(true)}
        isDisabled={isLoading || isDeletingFile}
        iconType="eye"
      >
        Select a file
      </EuiButton>,
      <EuiButton
        onClick={() => setShowUploadModal(true)}
        isDisabled={isLoading || isDeletingFile}
        iconType="exportAction"
      >
        Upload image
      </EuiButton>,
    ];
  };

  const items = [...(data?.files ?? [])].reverse();

  const columns: EuiInMemoryTableProps<FileJSON<MyImageMetadata>>['columns'] = [
    {
      field: 'name',
      name: 'Name',
      render: (name, item) => (
        <EuiLink disabled={isDeletingFile} onClick={() => setSelectedItem(item)}>
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'status',
      name: 'Status',
      render: (status: FileJSON['status']) =>
        status === 'READY' ? (
          <EuiIcon color="success" type="checkInCircleFilled" aria-label={status} />
        ) : status === 'AWAITING_UPLOAD' ? (
          <EuiIcon type="clock" aria-label={status} />
        ) : (
          <EuiIcon color="danger" type="warning" arial-label={status} />
        ),
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'View',
          description: 'View file',
          isPrimary: true,
          render: (item) => (
            <EuiButtonIcon
              disabled={isDeletingFile}
              aria-label="View file details"
              iconType="eye"
              onClick={() => setSelectedItem(item)}
            />
          ),
        },
        {
          name: 'Delete',
          description: 'Delete this file',
          render: (item) => (
            <ConfirmButtonIcon
              disabled={isDeletingFile}
              label="Delete this file"
              confirmationText="Are you sure you want to delete this file?"
              onConfirm={async () => {
                try {
                  setIsDeletingFile(true);
                  await files.example.delete({ id: item.id });
                  await refetch();
                } finally {
                  setIsDeletingFile(false);
                }
              }}
            />
          ),
        },
      ],
    },
  ];

  return (
    <EuiProvider>
      <EuiPageTemplate restrictWidth>
        <EuiPageTemplate.Header pageTitle="Files example" />
        <EuiPageTemplate.Section>
          <EuiInMemoryTable
            columns={columns}
            items={items}
            itemId="id"
            loading={isLoading || isDeletingFile}
            error={error ? JSON.stringify(error) : undefined}
            sorting
            search={{
              toolsRight: renderToolsRight(),
            }}
            pagination
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
      {selectedItem && (
        <DetailsFlyout
          files={files}
          file={selectedItem}
          onDismiss={() => setSelectedItem(undefined)}
        />
      )}
      {showUploadModal && (
        <Modal
          client={files.unscoped}
          onDismiss={() => setShowUploadModal(false)}
          onUploaded={() => {
            notifications.toasts.addSuccess('Uploaded file!');
            refetch();
            setShowUploadModal(false);
          }}
        />
      )}
      {showFilePickerModal && (
        <MyFilePicker
          onClose={() => setShowFilePickerModal(false)}
          onUpload={() => {
            notifications.toasts.addSuccess({
              title: 'Uploaded files',
            });
            refetch();
          }}
          onDone={(ids) => {
            notifications.toasts.addSuccess({
              title: 'Selected files!',
              text: 'IDS:' + JSON.stringify(ids, null, 2),
            });
            setShowFilePickerModal(false);
          }}
        />
      )}
    </EuiProvider>
  );
};
