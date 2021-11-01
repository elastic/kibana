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
      >
        <div style={{ width: 368 }}>
          <EuiPopoverTitle>
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
        </div>
      </EuiPopover>
    </>
  );
}
