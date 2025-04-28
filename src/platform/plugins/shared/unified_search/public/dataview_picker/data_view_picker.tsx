/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';
import type { DataView, DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import { ChangeDataView } from './change_dataview';

export type ChangeDataViewTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

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
   * Callback that is called when the user edits the current data view via flyout.
   * The first parameter is the updated data view stub without fetched fields
   */
  onEditDataView?: (updatedDataViewStub: DataView) => void;
  /**
   * The id of the selected dataview.
   */
  currentDataViewId?: string;
  /**
   * The adHocDataviews.
   */
  adHocDataViews?: DataView[];
  /**
   * Data views managed by the application
   */
  managedDataViews?: DataView[];
  /**
   * Saved data views
   */
  savedDataViews?: DataViewListItem[];
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

  onCreateDefaultAdHocDataView?: (dataViewSpec: DataViewSpec) => void;
  /**
   * Makes the picker disabled by disabling the popover trigger
   */
  isDisabled?: boolean;
  /**
   * Optional callback when data view picker is closed
   */
  onClosePopover?: () => void;
}

export const DataViewPicker = ({
  isMissingCurrent,
  currentDataViewId,
  adHocDataViews,
  managedDataViews,
  savedDataViews,
  onChangeDataView,
  onEditDataView,
  onAddField,
  onDataViewCreated,
  onClosePopover,
  trigger,
  selectableProps,
  onCreateDefaultAdHocDataView,
  isDisabled,
}: DataViewPickerProps) => {
  return (
    <ChangeDataView
      isMissingCurrent={isMissingCurrent}
      currentDataViewId={currentDataViewId}
      onChangeDataView={onChangeDataView}
      onEditDataView={onEditDataView}
      onAddField={onAddField}
      onDataViewCreated={onDataViewCreated}
      onClosePopover={onClosePopover}
      onCreateDefaultAdHocDataView={onCreateDefaultAdHocDataView}
      trigger={trigger}
      adHocDataViews={adHocDataViews}
      managedDataViews={managedDataViews}
      savedDataViews={savedDataViews}
      selectableProps={selectableProps}
      isDisabled={isDisabled}
    />
  );
};
