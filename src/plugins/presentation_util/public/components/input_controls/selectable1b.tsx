/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiSelectable,
  EuiSelectableProps,
  EuiPopover,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import './selectable1b.scss';

export interface Props extends Pick<EuiSelectableProps, 'options' | 'onChange'> {
  label: string;
}

export const Selectable1B = ({ label, options }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectableOptions, setSelectableOptions] = useState(options);

  const selected = selectableOptions.filter((option) => option.checked);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        iconSide="right"
        iconType="arrowDown"
        onClick={() => setIsOpen(!isOpen)}
        className="s1bButton"
      >
        {selected.map((item) => item.label).join(', ')}
      </EuiButtonEmpty>
    ),
    [selected, isOpen]
  );

  return (
    <EuiFlexGroup alignItems="center" style={{ border: '1px solid #c5ced8' }} gutterSize="none">
      <EuiFlexItem
        grow={false}
        style={{ padding: 12, background: '#f7f9fa', whiteSpace: 'nowrap' }}
      >
        {label}
        {selected && selected.length > 0 ? ` (${selected.length})` : ''}
      </EuiFlexItem>
      <EuiFlexItem style={{ overflow: 'hidden' }}>
        <EuiPopover
          panelPaddingSize="s"
          isOpen={isOpen}
          button={button}
          attachToAnchor={true}
          closePopover={() => setIsOpen(false)}
          anchorClassName="s1bAnchor"
        >
          <EuiSelectable
            aria-label="Input Control Option 1.1"
            searchable
            options={selectableOptions}
            onChange={(newOptions) => setSelectableOptions(newOptions)}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
