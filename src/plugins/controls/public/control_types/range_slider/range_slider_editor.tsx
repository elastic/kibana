/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useEffect, useState } from 'react';
import { EuiFormRow } from '@elastic/eui';

import { DataViewListItem, DataView } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { pluginServices } from '../../services';
import { ControlEditorProps } from '../../types';
import { RangeSliderEmbeddableInput } from './types';
import { RangeSliderStrings } from './range_slider_strings';

interface RangeSliderEditorState {
  dataViewListItems: DataViewListItem[];
  dataView?: DataView;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const RangeSliderEditor = ({
  onChange,
  initialInput,
  setValidState,
  setDefaultTitle,
  getRelevantDataViewId,
  setLastUsedDataViewId,
  selectedField,
  setSelectedField,
}: ControlEditorProps<RangeSliderEmbeddableInput>) => {
  // Controls Services Context
  const { dataViews } = pluginServices.getHooks();
  const { getIdsWithTitle, getDefaultId, get } = dataViews.useService();

  const [state, setState] = useState<RangeSliderEditorState>({
    dataViewListItems: [],
  });

  useMount(() => {
    let mounted = true;
    if (selectedField) setDefaultTitle(selectedField);
    (async () => {
      const dataViewListItems = await getIdsWithTitle();
      const initialId =
        initialInput?.dataViewId ?? getRelevantDataViewId?.() ?? (await getDefaultId());
      let dataView: DataView | undefined;
      if (initialId) {
        onChange({ dataViewId: initialId });
        dataView = await get(initialId);
      }
      if (!mounted) return;
      setState((s) => ({ ...s, dataView, dataViewListItems }));
    })();
    return () => {
      mounted = false;
    };
  });

  useEffect(
    () => setValidState(Boolean(selectedField) && Boolean(state.dataView)),
    [selectedField, setValidState, state.dataView]
  );

  const { dataView } = state;
  return (
    <>
      <EuiFormRow label={RangeSliderStrings.editor.getDataViewTitle()}>
        <DataViewPicker
          dataViews={state.dataViewListItems}
          selectedDataViewId={dataView?.id}
          onChangeDataViewId={(dataViewId) => {
            setLastUsedDataViewId?.(dataViewId);
            if (dataViewId === dataView?.id) return;

            onChange({ dataViewId });
            setSelectedField(undefined);
            get(dataViewId).then((newDataView) => {
              setState((s) => ({ ...s, dataView: newDataView }));
            });
          }}
          trigger={{
            label: state.dataView?.title ?? RangeSliderStrings.editor.getNoDataViewTitle(),
          }}
        />
      </EuiFormRow>
      <EuiFormRow label={RangeSliderStrings.editor.getFieldTitle()}>
        <FieldPicker
          filterPredicate={(field) => field.aggregatable && field.type === 'number'}
          selectedFieldName={selectedField}
          dataView={dataView}
          onSelectField={(field) => {
            setDefaultTitle(field.displayName ?? field.name);
            onChange({ fieldName: field.name });
            setSelectedField(field.name);
          }}
        />
      </EuiFormRow>
    </>
  );
};
