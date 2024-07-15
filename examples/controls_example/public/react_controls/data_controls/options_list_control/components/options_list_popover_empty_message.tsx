/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiIcon, EuiSelectableMessage, EuiSpacer } from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { ControlStateManager } from '../../../types';
import { OptionsListComponentApi, OptionsListComponentState } from '../types';
import { OptionsListStrings } from './options_list_strings';

export const OptionsListPopoverEmptyMessage = ({
  api,
  stateManager,
  showOnlySelected,
}: {
  showOnlySelected: boolean;
  api: OptionsListComponentApi;
  stateManager: ControlStateManager<OptionsListComponentState>;
}) => {
  const [searchTechnique, searchStringValid, fieldSpec] = useBatchedPublishingSubjects(
    stateManager.searchTechnique,
    stateManager.searchStringValid,
    api.fieldSpec
  );

  const noResultsMessage = useMemo(() => {
    if (showOnlySelected) {
      return OptionsListStrings.popover.getSelectionsEmptyMessage();
    }
    if (!searchStringValid && fieldSpec && searchTechnique) {
      return OptionsListStrings.popover.getInvalidSearchMessage(fieldSpec.type);
    }
    return OptionsListStrings.popover.getEmptyMessage();
  }, [showOnlySelected, fieldSpec, searchStringValid, searchTechnique]);

  return (
    <EuiSelectableMessage
      tabIndex={0}
      data-test-subj={`optionsList-control-${
        showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
      }`}
    >
      <EuiIcon
        type={searchStringValid ? 'minusInCircle' : 'alert'}
        color={searchStringValid ? 'default' : 'danger'}
      />
      <EuiSpacer size="xs" />
      {noResultsMessage}
    </EuiSelectableMessage>
  );
};
