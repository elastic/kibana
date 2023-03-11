/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiSpacer } from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';

export const OptionsListPopoverEmptyMessage = ({
  showOnlySelected,
}: {
  showOnlySelected: boolean;
}) => {
  return (
    <span
      className="euiFilterSelect__note"
      data-test-subj={`optionsList-control-${
        showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
      }`}
    >
      <span className="euiFilterSelect__noteContent">
        <EuiIcon type="minusInCircle" />
        <EuiSpacer size="xs" />
        {showOnlySelected
          ? OptionsListStrings.popover.getSelectionsEmptyMessage()
          : OptionsListStrings.popover.getEmptyMessage()}
      </span>
    </span>
  );
};
