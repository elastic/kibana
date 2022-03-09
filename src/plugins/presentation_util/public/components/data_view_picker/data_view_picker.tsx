/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectable, EuiSelectableProps } from '@elastic/eui';
import { DataViewListItem } from '../../../../data_views/common';

import { ToolbarButton, ToolbarButtonProps } from '../../../../kibana_react/public';

import './data_view_picker.scss';

export type DataViewTriggerProps = ToolbarButtonProps & {
  label: string;
  title?: string;
};

export function DataViewPicker({
  dataViews,
  selectedDataViewId,
  onChangeDataViewId,
  trigger,
  selectableProps,
}: {
  dataViews: DataViewListItem[];
  selectedDataViewId?: string;
  trigger: DataViewTriggerProps;
  onChangeDataViewId: (newId: string) => void;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const isMissingCurrent = !dataViews.some(({ id }) => id === selectedDataViewId);

  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <ToolbarButton
        title={title}
        data-test-subj="open-data-view-picker"
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        fullWidth
        {...colorProp}
        {...rest}
      >
        {label}
      </ToolbarButton>
    );
  };

  return (
    <>
      <EuiPopover
        button={createTrigger()}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
        panelClassName="presDataViewPicker__panel"
      >
        <EuiPopoverTitle data-test-subj="data-view-picker-title">
          {i18n.translate('presentationUtil.dataViewPicker.changeDataViewTitle', {
            defaultMessage: 'Data view',
          })}
        </EuiPopoverTitle>
        <EuiSelectable<{
          key?: string;
          label: string;
          value?: string;
          checked?: 'on' | 'off' | undefined;
        }>
          {...selectableProps}
          searchable
          singleSelection="always"
          options={dataViews.map(({ title, id }) => ({
            key: id,
            label: title,
            value: id,
            'data-test-subj': `data-view-picker-${title}`,
            checked: id === selectedDataViewId ? 'on' : undefined,
          }))}
          onChange={(choices) => {
            const choice = choices.find(({ checked }) => checked) as unknown as {
              value: string;
            };
            onChangeDataViewId(choice.value);
            setPopoverIsOpen(false);
          }}
          searchProps={{
            compressed: true,
            ...(selectableProps ? selectableProps.searchProps : undefined),
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiPopover>
    </>
  );
}

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DataViewPicker;
