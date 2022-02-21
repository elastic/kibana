/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DataViewEditorContext, DataViewPickerProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';
import { ChangeDataView } from './change_dataview';
export interface DataViewPickerPropsWithServices extends DataViewPickerProps {
  services: DataViewEditorContext;
}

export const DataViewPicker = ({
  indexPatternRefs,
  isMissingCurrent,
  indexPatternId,
  onChangeDataView,
  onAddField,
  trigger,
  selectableProps,
  services,
}: DataViewPickerPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<DataViewEditorContext>(services);

  return (
    <KibanaReactContextProvider>
      <ChangeDataView
        indexPatternRefs={indexPatternRefs}
        isMissingCurrent={isMissingCurrent}
        indexPatternId={indexPatternId}
        onChangeDataView={onChangeDataView}
        onAddField={onAddField}
        trigger={trigger}
        selectableProps={selectableProps}
      />
    </KibanaReactContextProvider>
  );
};
