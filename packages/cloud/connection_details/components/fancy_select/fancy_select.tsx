/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFormControlLayout,
  EuiHorizontalRule,
  EuiInputPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { FancySelectOption } from './types';

export interface FancySelectProps {
  value: string;
  options: FancySelectOption[];
  onChange: (value: string) => void;
}

export const FancySelect: React.FC<FancySelectProps> = ({
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false);

  let  selected: undefined | FancySelectOption;

  if (value) {
    selected = options.find((option) => option.id === value);
  }

  const items: React.ReactNode[] = [];

  for (let i = 0; i < options.length; i++) {
    const isLast = i === options.length - 1;
    const option = options[i];
    const handleSelect = () => {
      setOpen(false);
      onChange(option.id);
    };

    items.push(
      <EuiContextMenuItem
        key={option.id}
        icon={option.icon}
        layoutAlign="top"
        onSelect={handleSelect}
        onClick={handleSelect}
      >
        <strong>{option.title}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{option.description}</p>
        </EuiText>
      </EuiContextMenuItem>
    );

    if (!isLast) {
      items.push(<EuiHorizontalRule key={`${option.id}-separator`} margin="none" />);
    }
  }

  return (
    <EuiInputPopover
      input={
        <EuiFormControlLayout icon={selected?.icon} isDropdown>
          <EuiFieldText
            readOnly
            type="search"
            value={'      ' + selected?.title}
          />
        </EuiFormControlLayout>
      }
      isOpen={true}
      panelPaddingSize="none"
      onClick={() => {
        if (!open) {
          setOpen(true);
        }
      }}
      closePopover={() => setOpen(false)}
    >
      {open && (
        <EuiContextMenuPanel
          initialFocusedItemIndex={0}
          items={items}
        />
      )}
    </EuiInputPopover>
  );
};
