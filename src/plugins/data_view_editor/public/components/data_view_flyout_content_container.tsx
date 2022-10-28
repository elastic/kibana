/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { DataViewSpec, useKibana } from '../shared_imports';
import { IndexPatternEditorFlyoutContent } from './data_view_editor_flyout_content';
import { DataViewEditorContext, DataViewEditorProps } from '../types';
import { DataViewEditorService } from '../data_view_editor_service';

// @ts-expect-error
export const DataViewEditorServiceContext = React.createContext<{
  dataViewEditorService: DataViewEditorService;
}>();

const DataViewFlyoutContentContainer = ({
  onSave,
  onCancel = () => {},
  defaultTypeIsRollup,
  requireTimestampField = false,
  editData,
  allowAdHocDataView,
  showManagementLink,
}: DataViewEditorProps) => {
  const {
    services: { dataViews, notifications, http },
  } = useKibana<DataViewEditorContext>();

  const onSaveClick = async (dataViewSpec: DataViewSpec, persist: boolean = true) => {
    try {
      let saveResponse;
      if (editData) {
        const { name = '', timeFieldName, title = '' } = dataViewSpec;
        editData.setIndexPattern(title);
        editData.name = name;
        editData.timeFieldName = timeFieldName;
        saveResponse = editData.isPersisted()
          ? await dataViews.updateSavedObject(editData)
          : editData;
      } else {
        saveResponse = persist
          ? await dataViews.createAndSave(dataViewSpec)
          : await dataViews.create(dataViewSpec);
      }

      if (saveResponse && !(saveResponse instanceof Error)) {
        if (persist) {
          const message = i18n.translate('indexPatternEditor.saved', {
            defaultMessage: "Saved '{indexPatternName}'",
            values: { indexPatternName: saveResponse.getName() },
          });
          notifications.toasts.addSuccess(message);
        }
        await onSave(saveResponse);
      }
    } catch (e) {
      const title = i18n.translate('indexPatternEditor.dataView.unableSaveLabel', {
        defaultMessage: 'Failed to save data view.',
      });

      notifications.toasts.addDanger({ title });
    }
  };

  const dataViewEditorService = new DataViewEditorService({
    http,
    dataViews,
    initialName: editData?.name,
  });

  return (
    <DataViewEditorServiceContext.Provider value={{ dataViewEditorService }}>
      <IndexPatternEditorFlyoutContent
        onSave={onSaveClick}
        onCancel={onCancel}
        defaultTypeIsRollup={defaultTypeIsRollup}
        requireTimestampField={requireTimestampField}
        editData={editData}
        showManagementLink={showManagementLink}
        allowAdHoc={allowAdHocDataView || false}
      />
    </DataViewEditorServiceContext.Provider>
  );
};

/* eslint-disable import/no-default-export */
export default DataViewFlyoutContentContainer;
