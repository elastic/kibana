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
import { useBatchedPublishingSubjects, type PublishingSubject } from '@kbn/presentation-publishing';

import { BehaviorSubject } from 'rxjs';
import { isDSLOptionsListApi } from '../../../utils';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';
import type { DSLOptionsListComponentApi } from '../types';

export const OptionsListPopoverEmptyMessage = ({
  showOnlySelected,
}: {
  showOnlySelected: boolean;
}) => {
  const { componentApi } = useOptionsListContext();

  const conditionalApiSubjects: [
    DSLOptionsListComponentApi['searchStringValid$'] | PublishingSubject<undefined>,
    DSLOptionsListComponentApi['searchTechnique$'] | PublishingSubject<undefined>,
    DSLOptionsListComponentApi['field$'] | PublishingSubject<undefined>
  ] = useMemo(() => {
    const isDSLControl = isDSLOptionsListApi(componentApi);
    return [
      isDSLControl ? componentApi.searchStringValid$ : new BehaviorSubject(undefined),
      isDSLControl ? componentApi.searchTechnique$ : new BehaviorSubject(undefined),
      isDSLControl ? componentApi.field$ : new BehaviorSubject(undefined),
    ];
  }, [componentApi]);

  const [searchTechnique, searchStringValid, field] = useBatchedPublishingSubjects(
    ...conditionalApiSubjects
  );

  const noResultsMessage = useMemo(() => {
    if (showOnlySelected) {
      return OptionsListStrings.popover.getSelectionsEmptyMessage();
    }
    if (!searchStringValid && field && searchTechnique) {
      return OptionsListStrings.popover.getInvalidSearchMessage(field.type);
    }
    return OptionsListStrings.popover.getEmptyMessage();
  }, [showOnlySelected, field, searchStringValid, searchTechnique]);

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
