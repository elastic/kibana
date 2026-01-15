/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { css } from '@emotion/react';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { useOptionsListContext } from '../options_list_context_provider';
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

  const [field, availableOptions, invalidSelections, loading] = useBatchedPublishingSubjects(
    componentApi.field$,
    componentApi.availableOptions$,
    componentApi.invalidSelections$,
    componentApi.dataLoading$
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
