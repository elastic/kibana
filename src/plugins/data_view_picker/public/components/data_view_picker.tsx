/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createKibanaReactContext } from '../../../kibana_react/public';
import { DataViewPickerContext, DataViewPickerProps } from '../types';
import { ChangeDataView } from './change_dataview';
export interface DataViewPickerPropsWithServices extends DataViewPickerProps {
  services: DataViewPickerContext;
}

export const DataViewPicker = ({
  isMissingCurrent,
  currentDataViewId,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  services,
}: DataViewPickerPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<DataViewPickerContext>(services);

  return (
    <KibanaReactContextProvider>
      <ChangeDataView
        isMissingCurrent={isMissingCurrent}
        currentDataViewId={currentDataViewId}
        onChangeDataView={onChangeDataView}
        onAddField={onAddField}
        onDataViewCreated={onDataViewCreated}
        trigger={trigger}
        selectableProps={selectableProps}
      />
    </KibanaReactContextProvider>
  );
};
