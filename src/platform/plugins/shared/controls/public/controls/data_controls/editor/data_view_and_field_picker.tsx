/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { createContext, useContext } from 'react';
import { EuiCallOut, EuiFormRow } from '@elastic/eui';

import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { DataView, DataViewField, DataViewListItem } from '@kbn/data-views-plugin/common';

import { ControlGroupEditorConfig } from '../../../../common';
import { DataControlEditorStrings } from '../data_control_constants';
import { type DataControlFieldRegistry } from '../types';

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

interface DataViewAndFieldPickerProps {
  dataViewId?: string;
  onChangeDataViewId: (dataView: string) => void;
  onSelectField: (field: DataViewField) => void;
  fieldName?: string;
  editorConfig?: ControlGroupEditorConfig;
}

export interface DataViewAndFieldContextValue {
  dataViewListItems: DataViewListItem[];
  dataViewListLoading: boolean;
  dataViewLoading: boolean;
  dataViewListError?: Error;
  selectedDataView?: DataView;
  fieldListError?: Error;
  fieldRegistry?: DataControlFieldRegistry;
}

const DataViewAndFieldContext = createContext<DataViewAndFieldContextValue>({
  dataViewListItems: [],
  dataViewListLoading: false,
  dataViewLoading: false,
});

export const DataViewAndFieldContextProvider = DataViewAndFieldContext.Provider;
export const useDataViewAndFieldContext = () => useContext(DataViewAndFieldContext);

export const DataViewAndFieldPicker: React.FC<DataViewAndFieldPickerProps> = ({
  dataViewId,
  editorConfig,
  onChangeDataViewId,
  onSelectField,
  fieldName,
}) => {
  const {
    dataViewListError,
    dataViewListItems,
    dataViewListLoading,
    dataViewLoading,
    selectedDataView,
    fieldListError,
    fieldRegistry,
  } = useDataViewAndFieldContext();
  return (
    <>
      {!editorConfig?.hideDataViewSelector && (
        <EuiFormRow
          data-test-subj="control-editor-data-view-picker"
          label={DataControlEditorStrings.manageControl.dataSource.getDataViewTitle()}
        >
          {dataViewListError ? (
            <EuiCallOut
              color="danger"
              iconType="error"
              title={DataControlEditorStrings.manageControl.dataSource.getDataViewListErrorTitle()}
            >
              <p>{dataViewListError.message}</p>
            </EuiCallOut>
          ) : (
            <DataViewPicker
              dataViews={dataViewListItems}
              selectedDataViewId={dataViewId}
              onChangeDataViewId={onChangeDataViewId}
              trigger={{
                label:
                  selectedDataView?.getName() ??
                  DataControlEditorStrings.manageControl.dataSource.getSelectDataViewMessage(),
              }}
              selectableProps={{ isLoading: dataViewListLoading }}
            />
          )}
        </EuiFormRow>
      )}
      <EuiFormRow label={DataControlEditorStrings.manageControl.dataSource.getFieldTitle()}>
        {fieldListError ? (
          <EuiCallOut
            color="danger"
            iconType="error"
            title={DataControlEditorStrings.manageControl.dataSource.getFieldListErrorTitle()}
          >
            <p>{fieldListError.message}</p>
          </EuiCallOut>
        ) : (
          <FieldPicker
            filterPredicate={(field: DataViewField) => {
              const customPredicate = editorConfig?.fieldFilterPredicate?.(field) ?? true;
              return Boolean(fieldRegistry?.[field.name]) && customPredicate;
            }}
            selectedFieldName={fieldName}
            dataView={selectedDataView}
            onSelectField={onSelectField}
            selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
          />
        )}
      </EuiFormRow>
    </>
  );
};
