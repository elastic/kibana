/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { INDEX_PATTERN_TYPE, DataViewLazy } from '@kbn/data-views-plugin/public';
import { DataViewSpec, useKibana } from '../shared_imports';
import { IndexPatternEditorFlyoutContent } from './data_view_editor_flyout_content';
import { DataViewEditorContext, DataViewEditorPropsInternal } from '../types';
import { DataViewEditorService } from '../data_view_editor_service';

const DataViewFlyoutContentContainer = ({
  onSave,
  onCancel = () => {},
  defaultTypeIsRollup,
  requireTimestampField = false,
  editData,
  allowAdHocDataView,
  showManagementLink,
}: DataViewEditorPropsInternal) => {
  const {
    services: { dataViews, notifications, http },
  } = useKibana<DataViewEditorContext>();

  const [dataViewEditorService] = useState(
    () =>
      new DataViewEditorService({
        services: { http, dataViews },
        initialValues: {
          name: editData?.name,
          type: editData?.type as INDEX_PATTERN_TYPE,
          indexPattern: editData?.getIndexPattern(),
        },
        requireTimestampField,
      })
  );

  useEffect(() => {
    const service = dataViewEditorService;
    return service.destroy;
  }, [dataViewEditorService]);

  const onSaveClick = async (dataViewSpec: DataViewSpec, persist: boolean = true) => {
    try {
      let saveResponse: DataViewLazy;
      if (editData) {
        const { name = '', timeFieldName, title = '', allowHidden = false } = dataViewSpec;
        editData.setIndexPattern(title);
        editData.name = name;
        editData.timeFieldName = timeFieldName;
        editData.setAllowHidden(allowHidden);
        if (editData.isPersisted()) {
          await dataViews.updateSavedObject(editData);
        }
        saveResponse = await dataViews.toDataViewLazy(editData);
      } else {
        saveResponse = persist
          ? await dataViews.createAndSaveDataViewLazy(dataViewSpec)
          : await dataViews.createDataViewLazy(dataViewSpec);
      }

      if (saveResponse && !(saveResponse instanceof Error)) {
        // clears legacy data view cache, clients will need to fetch the data view again
        dataViews.clearInstanceCache(saveResponse.id);

        if (persist) {
          const title = i18n.translate('indexPatternEditor.saved', {
            defaultMessage: 'Saved',
          });
          const text = `'${saveResponse.getName()}'`;
          notifications.toasts.addSuccess({
            title,
            text,
          });
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

  return (
    <IndexPatternEditorFlyoutContent
      onSave={onSaveClick}
      onCancel={onCancel}
      defaultTypeIsRollup={defaultTypeIsRollup}
      editData={editData}
      showManagementLink={showManagementLink}
      allowAdHoc={allowAdHocDataView || false}
      dataViewEditorService={dataViewEditorService}
    />
  );
};

/* eslint-disable import/no-default-export */
export default DataViewFlyoutContentContainer;
