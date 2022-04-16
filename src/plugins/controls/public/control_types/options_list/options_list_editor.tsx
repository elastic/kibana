/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useEffect, useState } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { DataViewListItem, DataView } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { pluginServices } from '../../services';
import { ControlEditorProps } from '../../types';
import { OptionsListEmbeddableInput } from './types';
import { OptionsListStrings } from './options_list_strings';

interface OptionsListEditorState {
  singleSelect?: boolean;

  dataViewListItems: DataViewListItem[];

  dataView?: DataView;
  fieldName?: string;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const OptionsListEditor = ({
  onChange,
  initialInput,
  setValidState,
  setDefaultTitle,
  getRelevantDataViewId,
  setLastUsedDataViewId,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  // Controls Services Context
  const { dataViews } = pluginServices.getHooks();
  const { getIdsWithTitle, getDefaultId, get } = dataViews.useService();

  const [state, setState] = useState<OptionsListEditorState>({
    fieldName: initialInput?.fieldName,
    singleSelect: initialInput?.singleSelect,
    dataViewListItems: [],
  });

  useMount(() => {
    let mounted = true;
    if (state.fieldName) setDefaultTitle(state.fieldName);
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
    () => setValidState(Boolean(state.fieldName) && Boolean(state.dataView)),
    [state.fieldName, setValidState, state.dataView]
  );

  const { dataView, fieldName } = state;
  return (
    <>
      <EuiFormRow label={OptionsListStrings.editor.getDataViewTitle()}>
        <DataViewPicker
          dataViews={state.dataViewListItems}
          selectedDataViewId={dataView?.id}
          onChangeDataViewId={(dataViewId) => {
            setLastUsedDataViewId?.(dataViewId);
            if (dataViewId === dataView?.id) return;

            onChange({ dataViewId });
            setState((s) => ({ ...s, fieldName: undefined }));
            get(dataViewId).then((newDataView) => {
              setState((s) => ({ ...s, dataView: newDataView }));
            });
          }}
          trigger={{
            label: state.dataView?.title ?? OptionsListStrings.editor.getNoDataViewTitle(),
          }}
        />
      </EuiFormRow>
      <EuiFormRow label={OptionsListStrings.editor.getFieldTitle()}>
        <FieldPicker
          filterPredicate={(field) =>
            (field.aggregatable && field.type === 'string') || field.type === 'boolean'
          }
          selectedFieldName={fieldName}
          dataView={dataView}
          onSelectField={(field) => {
            setDefaultTitle(field.displayName ?? field.name);
            onChange({ fieldName: field.name });
            setState((s) => ({ ...s, fieldName: field.name }));
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getAllowMultiselectTitle()}
          checked={!state.singleSelect}
          onChange={() => {
            onChange({ singleSelect: !state.singleSelect });
            setState((s) => ({ ...s, singleSelect: !s.singleSelect }));
          }}
        />
      </EuiFormRow>
    </>
  );
};
