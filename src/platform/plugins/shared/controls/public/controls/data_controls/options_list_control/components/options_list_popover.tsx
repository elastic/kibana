/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import { css } from '@emotion/react';
import { useBatchedPublishingSubjects, type PublishingSubject } from '@kbn/presentation-publishing';

import { isDSLOptionsListApi } from '../../../utils';
import { useOptionsListContext } from '../options_list_context_provider';
import type { DSLOptionsListComponentApi } from '../types';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';

const optionsListPopoverStyles = {
  wrapper: css({
    width: '100%',
    height: '100%',
  }),
};

export const OptionsListPopover = ({
  disableMultiValueEmptySelection = false,
}: {
  disableMultiValueEmptySelection?: boolean;
}) => {
  const { componentApi, displaySettings } = useOptionsListContext();

  const conditionalApiSubjects: [
    DSLOptionsListComponentApi['field$'] | PublishingSubject<undefined>,
    DSLOptionsListComponentApi['invalidSelections$'] | PublishingSubject<undefined>
  ] = useMemo(() => {
    const isDSLControl = isDSLOptionsListApi(componentApi);
    return [
      isDSLControl ? componentApi.field$ : new BehaviorSubject(undefined),
      isDSLControl ? componentApi.invalidSelections$ : new BehaviorSubject(undefined),
    ];
  }, [componentApi]);

  const [loading, availableOptions, field, invalidSelections] = useBatchedPublishingSubjects(
    componentApi.dataLoading$,
    componentApi.availableOptions$,
    ...conditionalApiSubjects
  );
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  return (
    <div
      id={`control-popover-${componentApi.uuid}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsList-control-popover`}
    >
      {field?.type !== 'boolean' && !displaySettings.hide_action_bar && (
        <OptionsListPopoverActionBar
          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
          disableMultiValueEmptySelection={disableMultiValueEmptySelection}
        />
      )}
      <div
        data-test-subj={`optionsList-control-available-options`}
        data-option-count={loading ? 0 : Object.keys(availableOptions ?? {}).length}
        css={optionsListPopoverStyles.wrapper}
      >
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected} />
        {!showOnlySelected && invalidSelections && invalidSelections.size !== 0 && (
          <OptionsListPopoverInvalidSelections />
        )}
      </div>
      {!displaySettings.hide_exclude && <OptionsListPopoverFooter />}
    </div>
  );
};
