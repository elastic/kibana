/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { ChangeDataView } from './change_dataview';

export type ChangeDataViewTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

export enum TextBasedLanguages {
  SQL = 'SQL',
  ESQL = 'ESQL',
}

export interface OnSaveTextLanguageQueryProps {
  onSave: () => void;
}

/** @public */
export interface DataViewPickerProps {
  trigger: ChangeDataViewTriggerProps;
  isMissingCurrent?: boolean;
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  onAddField?: () => void;
  onDataViewCreated?: () => void;
  showNewMenuTour?: boolean;
  // list of the supported text-based languages per application
  textBasedLanguages?: TextBasedLanguages[];
  // called when the user clicks the Save and switch transition modal button
  onSaveTextLanguageQuery?: ({ onSave }: OnSaveTextLanguageQueryProps) => void;
}

export interface DataViewPickerPropsExtended extends DataViewPickerProps {
  onTextLangQuerySubmit?: (query?: AggregateQuery) => void;
  textBasedLanguage?: string;
}

export const DataViewPicker = ({
  isMissingCurrent,
  currentDataViewId,
  onChangeDataView,
  onAddField,
  onDataViewCreated,
  trigger,
  selectableProps,
  showNewMenuTour,
  textBasedLanguages,
  onSaveTextLanguageQuery,
  onTextLangQuerySubmit,
  textBasedLanguage,
}: DataViewPickerPropsExtended) => {
  return (
    <ChangeDataView
      isMissingCurrent={isMissingCurrent}
      currentDataViewId={currentDataViewId}
      onChangeDataView={onChangeDataView}
      onAddField={onAddField}
      onDataViewCreated={onDataViewCreated}
      trigger={trigger}
      selectableProps={selectableProps}
      showNewMenuTour={showNewMenuTour}
      textBasedLanguages={textBasedLanguages}
      onSaveTextLanguageQuery={onSaveTextLanguageQuery}
      onTextLangQuerySubmit={onTextLangQuerySubmit}
      textBasedLanguage={textBasedLanguage}
    />
  );
};
