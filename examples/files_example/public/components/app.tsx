/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FilesClientResponses } from '@kbn/files-plugin/public';

import {
  EuiPageTemplate,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiLink,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { MyFilePicker } from './file_picker';
import type { FileTypeId, MyImageMetadata } from '../../common';
import type { FileClients } from '../types';
import { DetailsFlyout } from './details_flyout';
import { ConfirmButtonIcon } from './confirm_button';
import { Modal } from './modal';

interface FilesExampleAppDeps {
  files: FileClients;
  notifications: CoreStart['notifications'];
}

type ListResponse = FilesClientResponses<MyImageMetadata>['list'];

interface FilesTableProps extends FilesExampleAppDeps {
  data?: ListResponse;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  setShowUploadModal: Dispatch<SetStateAction<boolean>>;
  setShowFilePickerModal: Dispatch<SetStateAction<boolean>>;
  setSelectedItem: Dispatch<SetStateAction<undefined | FileJSON<MyImageMetadata>>>;
}

const FilesTable: FC<FilesTableProps> = ({
  files,
  data,
  isLoading,
  error,
  refetch,
  setSelectedItem,
  setShowFilePickerModal,
  setShowUploadModal,
}) => {
  const [isDeletingFile, setIsDeletingFile] = useState(false);

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
  );
};

export const FilesExampleApp = ({ files, notifications }: FilesExampleAppDeps) => {
  const exampleFilesQuery = useQuery<ListResponse>(['files'], () => files.example.list(), {
    refetchOnWindowFocus: false,
  });

  const exampleFilesNotDeletableQuery = useQuery<ListResponse>(
    ['filesNotDeletable'],
    () => files.exampleNotDeletable.list(),
    {
      refetchOnWindowFocus: false,
    }
  );

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);
  const [activeFileTypeId, setActiveFileTypeId] = useState<FileTypeId>('filesExample');
  const [selectedItem, setSelectedItem] = useState<undefined | FileJSON<MyImageMetadata>>();

  return (
    <>
      <EuiPageTemplate restrictWidth>
        <EuiPageTemplate.Header pageTitle="Files example" />
        <EuiPageTemplate.Section>
          <EuiTitle size="s">
            <h2>All UI actions in management UI</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <FilesTable
            {...{
              files,
              notifications,
              data: exampleFilesQuery.data,
              isLoading: exampleFilesQuery.isLoading,
              error: exampleFilesQuery.error,
              refetch: exampleFilesQuery.refetch,
              setSelectedItem,
              setShowFilePickerModal: (value) => {
                setActiveFileTypeId('filesExample');
                setShowFilePickerModal(value);
              },
              setShowUploadModal: (value) => {
                setActiveFileTypeId('filesExample');
                setShowUploadModal(value);
              },
            }}
          />

          <EuiSpacer size="xl" />

          <EuiTitle size="s">
            <h2>Files not deletable in management UI</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            The files uploaded in this table are not deletable in the Kibana {'>'} Management {'>'}{' '}
            Files UI
          </EuiText>
          <EuiSpacer size="s" />

          <FilesTable
            {...{
              files,
              notifications,
              data: exampleFilesNotDeletableQuery.data,
              isLoading: exampleFilesNotDeletableQuery.isLoading,
              error: exampleFilesNotDeletableQuery.error,
              refetch: exampleFilesNotDeletableQuery.refetch,
              setSelectedItem,
              setShowFilePickerModal: (value) => {
                setActiveFileTypeId('filesExampleNoMgtDelete');
                setShowFilePickerModal(value);
              },
              setShowUploadModal: (value) => {
                setActiveFileTypeId('filesExampleNoMgtDelete');
                setShowUploadModal(value);
              },
            }}
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
          fileKind={activeFileTypeId}
          onDismiss={() => setShowUploadModal(false)}
          onUploaded={() => {
            notifications.toasts.addSuccess('Uploaded file!');
            if (activeFileTypeId === 'filesExample') {
              exampleFilesQuery.refetch();
            } else {
              exampleFilesNotDeletableQuery.refetch();
            }
            setShowUploadModal(false);
          }}
        />
      )}
      {showFilePickerModal && (
        <MyFilePicker
          onClose={() => setShowFilePickerModal(false)}
          fileKind={activeFileTypeId}
          onUpload={() => {
            notifications.toasts.addSuccess({
              title: 'Uploaded files',
            });
            if (activeFileTypeId === 'filesExample') {
              exampleFilesQuery.refetch();
            } else {
              exampleFilesNotDeletableQuery.refetch();
            }
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
    </>
  );
};
