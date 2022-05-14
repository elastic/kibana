/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useEffect, useState } from 'react';

import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { IFieldSubTypeMulti } from '@kbn/es-query';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { DataViewListItem, DataView } from '@kbn/data-views-plugin/common';

import { pluginServices } from '../../services';
import { ControlEditorProps } from '../../types';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListEmbeddableInput, OptionsListField } from './types';
interface OptionsListEditorState {
  singleSelect?: boolean;
  runPastTimeout?: boolean;
  dataViewListItems: DataViewListItem[];
  fieldsMap?: { [key: string]: OptionsListField };
  dataView?: DataView;
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
  selectedField,
  setSelectedField,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  // Controls Services Context
  const { dataViews } = pluginServices.getHooks();
  const { getIdsWithTitle, getDefaultId, get } = dataViews.useService();

  const [state, setState] = useState<OptionsListEditorState>({
    singleSelect: initialInput?.singleSelect,
    runPastTimeout: initialInput?.runPastTimeout,
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
      setState((s) => ({ ...s, dataView, dataViewListItems, fieldsMap: {} }));
    })();
    return () => {
      mounted = false;
    };
  });

  useEffect(() => {
    if (!state.dataView) return;

    // double link the parent-child relationship so that we can filter in fields which are multi-typed to text / keyword
    const doubleLinkedFields: OptionsListField[] = state.dataView?.fields.getAll();
    for (const field of doubleLinkedFields) {
      const parentFieldName = (field.subType as IFieldSubTypeMulti)?.multi?.parent;
      if (parentFieldName) {
        (field as OptionsListField).parentFieldName = parentFieldName;
        const parentField = state.dataView?.getFieldByName(parentFieldName);
        (parentField as OptionsListField).childFieldName = field.name;
      }
    }

    const newFieldsMap: OptionsListEditorState['fieldsMap'] = {};
    for (const field of doubleLinkedFields) {
      if (field.type === 'boolean') {
        newFieldsMap[field.name] = field;
      }

      // field type is keyword, check if this field is related to a text mapped field and include it.
      else if (field.aggregatable && field.type === 'string') {
        const childField =
          (field.childFieldName && state.dataView?.fields.getByName(field.childFieldName)) ||
          undefined;
        const parentField =
          (field.parentFieldName && state.dataView?.fields.getByName(field.parentFieldName)) ||
          undefined;

        const textFieldName = childField?.esTypes?.includes('text')
          ? childField.name
          : parentField?.esTypes?.includes('text')
          ? parentField.name
          : undefined;

        newFieldsMap[field.name] = { ...field, textFieldName } as OptionsListField;
      }
    }
    setState((s) => ({ ...s, fieldsMap: newFieldsMap }));
  }, [state.dataView]);

  useEffect(
    () => setValidState(Boolean(selectedField) && Boolean(state.dataView)),
    [selectedField, setValidState, state.dataView]
  );

  const { dataView } = state;
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
            setSelectedField(undefined);
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
          filterPredicate={(field) => Boolean(state.fieldsMap?.[field.name])}
          selectedFieldName={selectedField}
          dataView={dataView}
          onSelectField={(field) => {
            setDefaultTitle(field.displayName ?? field.name);
            const textFieldName = state.fieldsMap?.[field.name].textFieldName;
            onChange({
              fieldName: field.name,
              textFieldName,
            });
            setSelectedField(field.name);
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
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
          checked={Boolean(state.runPastTimeout)}
          onChange={() => {
            onChange({ runPastTimeout: !state.runPastTimeout });
            setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
          }}
        />
      </EuiFormRow>
    </>
  );
};
