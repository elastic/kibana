/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';
import type { AggregateQuery, Query } from '@kbn/es-query';
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
  /**
   * The properties of the button that triggers the dataview picker.
   */
  trigger: ChangeDataViewTriggerProps;
  /**
   * Flag that should be enabled when the current dataview is missing.
   */
  isMissingCurrent?: boolean;
  /**
   * Callback that is called when the user changes the currently selected dataview.
   */
  onChangeDataView: (newId: string) => void;
  /**
   * The id of the selected dataview.
   */
  currentDataViewId?: string;
  /**
   * EuiSelectable properties.
   */
  selectableProps?: EuiSelectableProps;
  /**
   * Callback that is called when the user clicks the add runtime field option.
   * Also works as a flag to show the add runtime field button.
   */
  onAddField?: () => void;
  /**
   * Callback that is called when the user clicks the create dataview option.
   * Also works as a flag to show the create dataview button.
   */
  onDataViewCreated?: () => void;
  /**
   * Flag to show the tour component for the first time.
   */
  showNewMenuTour?: boolean;
  /**
   * List of the supported text based languages (SQL, ESQL) etc.
   * Defined per application, if not provided, no text based languages
   * will be available.
   */
  textBasedLanguages?: TextBasedLanguages[];
  /**
   * Callback that is called when the user clicks the Save and switch transition modal button
   */
  onSaveTextLanguageQuery?: ({ onSave }: OnSaveTextLanguageQueryProps) => void;
}

export interface DataViewPickerPropsExtended extends DataViewPickerProps {
  /**
   * Callback that is called when the user clicks the submit button
   */
  onTextLangQuerySubmit?: (query?: Query | AggregateQuery) => void;
  /**
   * Text based language that is currently selected; depends on the query
   */
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
