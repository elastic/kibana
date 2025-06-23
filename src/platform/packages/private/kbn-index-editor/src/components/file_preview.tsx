/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiAccordion, EuiButton, EuiSpacer, EuiTitle } from '@elastic/eui';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataLoadingState, DataTableColumnsMeta, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { buildDataTableRecord, DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import useMountedState from 'react-use/lib/useMountedState';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { noop } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextExtra } from '../types';

interface FilePreviewItem {
  fileName: string;
  sampleDocs: DataTableRecord[];
  dataView: DataView;
  mappings: FindFileStructureResponse['mappings'];
  columnNames: Exclude<FindFileStructureResponse['column_names'], undefined>;
}

export const FilesPreview: FC = () => {
  const { filesStatus, uploadStatus, fileClashes, deleteFile } = useFileUploadContext();

  const {
    services: { data },
  } = useKibana<KibanaContextExtra>();

  const isMounted = useMountedState();

  const [filePreviewItems, setFilePreviewItems] = useState<FilePreviewItem[]>([]);

  const {
    services: { messageImporter },
  } = useKibana<KibanaContextExtra>();

  const fetchFilePreview = useCallback(async () => {
    try {
      const previewResults = await Promise.allSettled(
        filesStatus.map((fileStatus, index) => {
          if (fileStatus.data) {
            return messageImporter.previewDocs(
              fileStatus.data,
              fileStatus.results?.ingest_pipeline!,
              10
            );
          }
        })
      );

      // Create an ad-hoc data view for each file
      const adHocDataViews = await Promise.all(
        filesStatus.map((fileStatus) => {
          return data.dataViews.create({
            id: fileStatus.fileName,
            title: `temp_${fileStatus.fileName}`,
            allowNoIndex: true,
          });
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

          if (promisePreviewResult.status === 'fulfilled') {
            const filePreview = promisePreviewResult.value!;
            const validESHits: EsHitRecord[] = filePreview?.docs
              ?.filter((d) => !!d.doc)
              .map<EsHitRecord>((d) => d.doc as EsHitRecord);

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

            return {
              fileName: status.fileName,
              sampleDocs: dataRecords,
              dataView: dV,
              mappings,
              columnNames,
            };
          } else {
            return {
              fileName: status.fileName,
              sampleDocs: [],
              dataView: dV,
              columnNames,
              mappings,
            };
          }
        })
      );
    } catch (error) {
      // Handle error appropriately, e.g., log it or show a notification
    }
  }, [data.dataViews, filesStatus, isMounted, messageImporter]);

  useEffect(() => {
    fetchFilePreview();
  }, [fetchFilePreview]);

  if (!filePreviewItems.length) return null;

  return uploadStatus.overallImportStatus === STATUS.NOT_STARTED && filesStatus.length > 0 ? (
    <div>
      {filePreviewItems.map((filePreviewItem, i) => {
        return (
          <EuiAccordion
            id={filePreviewItem.fileName}
            key={filePreviewItem.fileName}
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
            paddingSize="l"
          >
            <ResultsPreview
              sampleDocs={filePreviewItem.sampleDocs}
              dataView={filePreviewItem.dataView}
              mappings={filePreviewItem.mappings}
              columnNames={filePreviewItem.columnNames}
            />
          </EuiAccordion>
        );
      })}

      {fileClashes ? <div>clashes</div> : null}
      <EuiSpacer />
    </div>
  ) : null;
};

export type ResultsPreviewProps = Omit<FilePreviewItem, 'fileName'>;

const ResultsPreview: FC<ResultsPreviewProps> = ({
  sampleDocs,
  dataView,
  mappings,
  columnNames,
}) => {
  const {
    services: { data, theme, uiSettings, notifications, dataViewFieldEditor, fieldFormats },
  } = useKibana<KibanaContextExtra>();

  const services = useMemo(() => {
    const storage = new Storage(localStorage);
    return {
      data,
      theme,
      uiSettings,
      toastNotifications: notifications?.toasts,
      dataViewFieldEditor,
      fieldFormats,
      storage,
    };
  }, [data, theme, uiSettings, notifications?.toasts, dataViewFieldEditor, fieldFormats]);

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
    <UnifiedDataTable
      sampleSizeState={10}
      onSetColumns={noop}
      columns={columnNames!}
      rows={sampleDocs}
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
  );
};
