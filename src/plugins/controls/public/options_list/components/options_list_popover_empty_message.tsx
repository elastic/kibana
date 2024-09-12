/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { EuiIcon, EuiSelectableMessage, EuiSpacer } from '@elastic/eui';

import { useOptionsList } from '../embeddable/options_list_embeddable';
import { OptionsListStrings } from './options_list_strings';

export const OptionsListPopoverEmptyMessage = ({
  showOnlySelected,
}: {
  showOnlySelected: boolean;
}) => {
  const optionsList = useOptionsList();

  const searchString = optionsList.select((state) => state.componentState.searchString);
  const fieldSpec = optionsList.select((state) => state.componentState.field);
  const searchTechnique = optionsList.select((state) => state.explicitInput.searchTechnique);

  const noResultsMessage = useMemo(() => {
    if (showOnlySelected) {
      return OptionsListStrings.popover.getSelectionsEmptyMessage();
    }
    if (!searchString.valid && fieldSpec && searchTechnique) {
      return OptionsListStrings.popover.getInvalidSearchMessage(fieldSpec.type);
    }
    return OptionsListStrings.popover.getEmptyMessage();
  }, [showOnlySelected, fieldSpec, searchString.valid, searchTechnique]);

  return (
    <EuiSelectableMessage
      tabIndex={0}
      data-test-subj={`optionsList-control-${
        showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
      }`}
    >
      <EuiIcon
        type={searchString.valid ? 'minusInCircle' : 'alert'}
        color={searchString.valid ? 'default' : 'danger'}
      />
      <EuiSpacer size="xs" />
      {noResultsMessage}
    </EuiSelectableMessage>
  );
};
