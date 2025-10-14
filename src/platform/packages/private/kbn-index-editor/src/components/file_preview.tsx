/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButton,
  EuiCodeBlock,
  EuiSpacer,
  EuiTabbedContent,
  type EuiTabbedContentTab,
  EuiTitle,
} from '@elastic/eui';
import { CLASH_ERROR_TYPE, STATUS, useFileUploadContext } from '@kbn/file-upload';
import type { FC } from 'react';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileClash } from '@kbn/file-upload/file_upload_manager';
import { FileClashResult } from './file_clashes';

interface FilePreviewItem {
  fileName: string;
  fileContents?: string;
  // Sample documents created by the inference pipeline simulate
  sampleDocs?: DataTableRecord[];
  columnNames: Exclude<FindFileStructureResponse['column_names'], undefined>;
  fileClash?: FileClash;
}

const FILE_PREVIEW_ROWS_LIMIT = 10;

export const FilesPreview: FC = () => {
  const { filesStatus, uploadStatus, deleteFile } = useFileUploadContext();

  const [filePreviewItems, setFilePreviewItems] = useState<FilePreviewItem[]>([]);

  useEffect(
    function updateFilePreviewItems() {
      // don't fetch preview if importing is in progress
      if (uploadStatus.overallImportStatus === STATUS.STARTED) {
        return;
      }

      // wait for all files to be analyzed before fetching previews
      if (
        filesStatus.length > 0 &&
        filesStatus.every((f) => f.analysisStatus === STATUS.COMPLETED)
      ) {
        setFilePreviewItems(
          filesStatus.map<FilePreviewItem>((status, index) => {
            const columnNames = status.results?.column_names || [];

            let fileClash: FileClash | undefined = uploadStatus.fileClashes[index];
            if (fileClash.clash === CLASH_ERROR_TYPE.NONE) {
              fileClash = undefined;
            }

            const item: FilePreviewItem = {
              fileName: status.fileName,
              columnNames,
              fileContents: status.fileContents
                .split('\n')
                .slice(0, FILE_PREVIEW_ROWS_LIMIT)
                .join('\n'),
              sampleDocs: status.sampleDocs,
              ...(fileClash ? { fileClash } : {}),
            };

            return item;
          })
        );
      }
    },
    [filesStatus, uploadStatus.fileClashes, uploadStatus.overallImportStatus]
  );

  if (!filePreviewItems.length) return null;

  return filesStatus.length > 0 ? (
    <div>
      {filePreviewItems.map((filePreviewItem, i) => {
        const tabs: EuiTabbedContentTab[] = [];

        if (filePreviewItem.sampleDocs?.length) {
          // Hide the File Preview tab if ingest pipeline didn't produce any results
          tabs.push({
            id: 'previewDoc',
            name: (
              <FormattedMessage id="indexEditor.fileUploader.previewTab" defaultMessage="Preview" />
            ),
            content: (
              <>
                <EuiSpacer size={'s'} />
                <ResultsPreview
                  sampleDocs={filePreviewItem.sampleDocs}
                  columnNames={filePreviewItem.columnNames}
                />
              </>
            ),
          });
        }

        if (filePreviewItem.fileContents) {
          tabs.push({
            id: 'fileContent',
            name: (
              <FormattedMessage
                id="indexEditor.fileUploader.fileContentTab"
                defaultMessage="File content"
              />
            ),
            content: (
              <>
                <EuiSpacer size={'s'} />
                <EuiCodeBlock paddingSize="none" transparentBackground>
                  {filePreviewItem.fileContents}
                </EuiCodeBlock>
              </>
            ),
          });
        }

        if (filePreviewItem.fileClash) {
          tabs.push({
            id: 'fileClash',
            name: (
              <FormattedMessage
                id="indexEditor.fileUploader.fileClashTab"
                defaultMessage="File issues"
              />
            ),
            content: (
              <>
                <EuiSpacer size={'s'} />
                <FileClashResult fileClash={filePreviewItem.fileClash} />
              </>
            ),
          });
        }

        return (
          <Fragment key={filePreviewItem.fileName}>
            <EuiAccordion
              id={filePreviewItem.fileName}
              buttonContent={
                <EuiTitle size={'s'}>
                  <h4>{filePreviewItem.fileName}</h4>
                </EuiTitle>
              }
              initialIsOpen={i === 0}
              extraAction={
                <EuiButton
                  size="s"
                  iconType={'trash'}
                  color={'danger'}
                  onClick={async () => {
                    await deleteFile(i);
                  }}
                >
                  <FormattedMessage
                    id="indexEditor.fileUploader.removeFileButton"
                    defaultMessage="Remove file"
                  />
                </EuiButton>
              }
              paddingSize="s"
            >
              <EuiTabbedContent tabs={tabs} autoFocus="selected" />
            </EuiAccordion>
            <EuiSpacer size={'s'} />
          </Fragment>
        );
      })}
      <EuiSpacer />
    </div>
  ) : null;
};

export type ResultsPreviewProps = Omit<FilePreviewItem, 'fileName'>;

const ResultsPreview: FC<ResultsPreviewProps> = ({ sampleDocs, columnNames }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<object>>>(() => {
    return columnNames.map((name: string) => {
      return {
        field: name,
        name,
        dataType: 'auto',
        truncateText: { lines: 2 },
      };
    });
  }, [columnNames]);

  const items = useMemo(() => {
    return (
      sampleDocs?.map((doc) => {
        return doc.flattened;
      }) || []
    );
  }, [sampleDocs]);

  return (
    <>
      {sampleDocs?.length ? (
        <EuiBasicTable
          data-test-subj="indexEditorPreviewFile"
          tableLayout="auto"
          columns={columns}
          items={items}
          css={{ overflow: 'auto' }}
        />
      ) : null}
    </>
  );
};
