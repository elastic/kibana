/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiSpacer,
  EuiTabbedContent,
  type EuiTabbedContentTab,
  EuiTitle,
} from '@elastic/eui';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataLoadingState, DataTableColumnsMeta, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { FC, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { buildDataTableRecord, DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import useMountedState from 'react-use/lib/useMountedState';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { noop } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { MessageImporter } from '@kbn/file-upload-plugin/public';
import type { KibanaContextExtra } from '../types';

interface FilePreviewItem {
  fileName: string;
  fileContents?: string;
  filePreview: {
    // Sample documents created by the inference pipeline simulate
    sampleDocs?: DataTableRecord[];
    // Errors produced by the ingest pipeline for preview
    errors?: string[];
  };
  dataView: DataView;
  mappings: FindFileStructureResponse['mappings'];
  columnNames: Exclude<FindFileStructureResponse['column_names'], undefined>;
}

const FILE_PREVIEW_LIMIT = 10;

export const FilesPreview: FC = () => {
  const { filesStatus, uploadStatus, fileClashes, deleteFile } = useFileUploadContext();

  const {
    services: { data },
  } = useKibana<KibanaContextExtra>();

  const isMounted = useMountedState();

  const [filePreviewItems, setFilePreviewItems] = useState<FilePreviewItem[]>([]);

  const previewDocs = useCallback((...args: Parameters<MessageImporter['previewDocs']>) => {
    // Due to MessageImporter state, need to create a new instance for each call
    const messageImporter = new MessageImporter({});
    return messageImporter.previewDocs(...args);
  }, []);

  const fetchFilePreview = useCallback(async () => {
    try {
      const previewResults = await Promise.allSettled(
        filesStatus.map((fileStatus, index) => {
          if (fileStatus.data) {
            return previewDocs(fileStatus.data, fileStatus.results?.ingest_pipeline!, 10);
          }
        })
      );

      // Create an ad-hoc data view for each file
      const adHocDataViews = await Promise.all(
        filesStatus.map((fileStatus) => {
          return data.dataViews.create(
            {
              id: fileStatus.fileName,
              title: `temp_${fileStatus.fileName}`,
              allowNoIndex: true,
            },
            true,
            false
          );
        })
      );

      if (!isMounted()) return;

      setFilePreviewItems(
        filesStatus.map<FilePreviewItem>((status, index) => {
          const promisePreviewResult = previewResults[index];

          const dV = adHocDataViews[index];

          const columnNames = status.results?.column_names || [];
          const mappings = status.results?.mappings || {
            properties: {},
          };

          const item: FilePreviewItem = {
            fileName: status.fileName,
            dataView: dV,
            columnNames,
            mappings,
            fileContents: status.fileContents.split('\n').slice(0, FILE_PREVIEW_LIMIT).join('\n'),
            filePreview: {},
          };

          if (promisePreviewResult.status === 'fulfilled') {
            const filePreview = promisePreviewResult.value!;
            const validESHits: EsHitRecord[] = filePreview?.docs
              ?.filter((d) => !!d.doc)
              .map<EsHitRecord>((d) => d.doc as EsHitRecord);

            const previewErrors: string[] = filePreview?.docs
              ?.filter((d) => !!d.error)
              .map((err) => {
                return `${err.error?.reason} [${err.error?.caused_by?.reason}]`;
              });

            const dataRecords = validESHits?.map((doc, i) => {
              return buildDataTableRecord(
                {
                  ...doc,
                  _id: `${status.fileName}-${i}`,
                  _index: `temp_index_${i}`,
                },
                dV
              );
            });

            item.filePreview.sampleDocs = dataRecords;
            item.filePreview.errors = previewErrors;
          } else {
            //
          }

          return item;
        })
      );
    } catch (error) {
      // Handle error appropriately, e.g., log it or show a notification
    }
  }, [data.dataViews, filesStatus, isMounted, previewDocs]);

  useEffect(() => {
    // don't fetch preview if importing is in progress
    if (uploadStatus.overallImportStatus === STATUS.STARTED) {
      return;
    }

    // wait for all files to be analyzed before fetching previews
    if (filesStatus.length > 0 && filesStatus.every((f) => f.analysisStatus === STATUS.COMPLETED)) {
      fetchFilePreview();
    }

    return () => {
      // clean up ad hoc data views
    };
  }, [fetchFilePreview, filesStatus, uploadStatus.overallImportStatus]);

  if (!filePreviewItems.length) return null;

  return uploadStatus.overallImportStatus === STATUS.NOT_STARTED && filesStatus.length > 0 ? (
    <div>
      {filePreviewItems.map((filePreviewItem, i) => {
        const tabs: EuiTabbedContentTab[] = [];

        if (filePreviewItem.filePreview.sampleDocs || filePreviewItem.filePreview.errors) {
          tabs.push({
            id: 'previewDoc',
            name: (
              <FormattedMessage id="indexEditor.fileUploader.previewTab" defaultMessage="Preview" />
            ),
            content: (
              <>
                <EuiSpacer size={'s'} />
                <ResultsPreview
                  filePreview={filePreviewItem.filePreview}
                  dataView={filePreviewItem.dataView}
                  mappings={filePreviewItem.mappings}
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

      {fileClashes ? <div>clashes</div> : null}
      <EuiSpacer />
    </div>
  ) : null;
};

export type ResultsPreviewProps = Omit<FilePreviewItem, 'fileName'>;

const ResultsPreview: FC<ResultsPreviewProps> = ({
  filePreview,
  dataView,
  mappings,
  columnNames,
}) => {
  const {
    services: {
      data,
      theme,
      uiSettings,
      notifications,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    },
  } = useKibana<KibanaContextExtra>();

  const services = useMemo(() => {
    return {
      data,
      theme,
      uiSettings,
      toastNotifications: notifications?.toasts,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    };
  }, [data, theme, uiSettings, notifications?.toasts, dataViewFieldEditor, fieldFormats, storage]);

  const columnsMeta = useMemo(() => {
    return columnNames.reduce((acc, columnName) => {
      const typeFromMapping = mappings.properties[columnName]?.type || 'unknown';

      acc[columnName] = {
        type: 'string',
        esType: typeFromMapping,
      };
      return acc;
    }, {} as DataTableColumnsMeta);
  }, [columnNames, mappings.properties]);

  return (
    <>
      {filePreview?.errors?.length ? (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id={'indexEditor.fileUploader.previewTab.inferenceFailTitle'}
                defaultMessage={'Failed to load the preview'}
              />
            }
            color="danger"
            iconType="error"
          >
            <ul>
              {filePreview.errors.map((error, i) => {
                return <li key={i}>{error}</li>;
              })}
            </ul>
          </EuiCallOut>
          <EuiSpacer size={'s'} />
        </>
      ) : null}
      {filePreview.sampleDocs?.length ? (
        <UnifiedDataTable
          sampleSizeState={10}
          onSetColumns={noop}
          columns={columnNames!}
          rows={filePreview.sampleDocs}
          columnsMeta={columnsMeta}
          services={services}
          enableInTableSearch={false}
          isPlainRecord
          isSortEnabled={false}
          showMultiFields={false}
          showColumnTokens
          showTimeCol
          enableComparisonMode={false}
          isPaginationEnabled={false}
          showKeyboardShortcuts={false}
          canDragAndDropColumns={false}
          loadingState={DataLoadingState.loaded}
          dataView={dataView}
          sort={[]}
          ariaLabelledBy="lookupIndexDataGrid"
          maxDocFieldsDisplayed={100}
          showFullScreenButton={false}
          disableCellActions
          disableCellPopover
        />
      ) : null}
    </>
  );
};
