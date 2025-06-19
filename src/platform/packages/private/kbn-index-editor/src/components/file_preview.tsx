/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGrid, EuiSpacer } from '@elastic/eui';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataLoadingState, DataTableColumnsMeta, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextExtra } from '../types';

export const FilesPreview: FC = () => {
  const { filesStatus, uploadStatus, fileClashes } = useFileUploadContext();

  const isUploading = uploadStatus.overallImportStatus === STATUS.STARTED;

  return uploadStatus.overallImportStatus === STATUS.NOT_STARTED && filesStatus.length > 0 ? (
    <div>
      {filesStatus.map((status, i) => {
        console.log('🚀 ~ {filesStatus.map ~ status:', status.fileContents.split('\n'));
        const sample = status.fileContents.split('\n').slice(0, 10).join('\n');

        return sample;

        return status.results ? <ResultsPreview fileStructureResponse={status.results} /> : null;
      })}

      {fileClashes ? <div>clashes</div> : null}
      <EuiSpacer />
    </div>
  ) : null;
};

export interface ResultsPreviewProps {
  fileStructureResponse: FindFileStructureResponse;
}

const ResultsPreview: FC<ResultsPreviewProps> = ({ fileStructureResponse }) => {
  return null;
  const {
    services: { data, theme, uiSettings, notifications, dataViewFieldEditor, fieldFormats },
  } = useKibana<KibanaContextExtra>();

  const [activeColumns, setActiveColumns] = useState<string[]>(fileStructureResponse.column_names!);

  const onSetColumns = useCallback((columns: string[]) => {
    setActiveColumns(columns);
  }, []);

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
    return activeColumns.reduce((acc, columnName) => {
      const typeFromMapping =
        fileStructureResponse.mappings.properties[columnName]?.type || 'unknown';

      acc[columnName] = {
        type: 'string',
        esType: typeFromMapping,
      };
      return acc;
    }, {} as DataTableColumnsMeta);
  }, [activeColumns, fileStructureResponse.mappings.properties]);

  const rows = Object.entries(fileStructureResponse.field_stats).map(([key, value]) => {
    return key;
  });

  return (
    <UnifiedDataTable
      sampleSizeState={10}
      onSetColumns={onSetColumns}
      columns={activeColumns}
      rows={rows}
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
