/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFieldSearch,
  EuiFilterSelectItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPopoverTitle,
  EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';

import { Subject } from 'rxjs';
import { OptionsListStrings } from './options_list_strings';

interface OptionsListPopoverProps {
  loading: boolean;
  typeaheadSubject: Subject<string>;
  searchString?: string;
  updateOption: (index: number) => void;
  availableOptions?: EuiSelectableOption[];
}

export const OptionsListPopover = ({
  loading,
  updateOption,
  searchString,
  typeaheadSubject,
  availableOptions,
}: OptionsListPopoverProps) => {
  return (
    <>
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch
          compressed
          onChange={(event) => {
            typeaheadSubject.next(event.target.value);
          }}
          value={searchString}
        />
      </EuiPopoverTitle>
      <div className="optionsList--items">
        {!loading &&
          availableOptions &&
          availableOptions.map((item, index) => (
            <EuiFilterSelectItem
              checked={item.checked}
              key={index}
              onClick={() => updateOption(index)}
            >
              {item.label}
            </EuiFilterSelectItem>
          ))}
        {loading && (
          <div className="euiFilterSelect__note">
            <div className="euiFilterSelect__noteContent">
              <EuiLoadingChart size="m" />
              <EuiSpacer size="xs" />
              <p>{OptionsListStrings.popover.getLoadingMessage()}</p>
            </div>
          </div>
        )}

        {!loading && (!availableOptions || availableOptions.length === 0) && (
          <div className="euiFilterSelect__note">
            <div className="euiFilterSelect__noteContent">
              <EuiIcon type="minusInCircle" />
              <EuiSpacer size="xs" />
              <p>{OptionsListStrings.popover.getEmptyMessage()}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
