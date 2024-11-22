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
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';

export const OptionsListPopover = () => {
  const { api, displaySettings } = useOptionsListContext();

  const [field, availableOptions, invalidSelections, loading] = useBatchedPublishingSubjects(
    api.field$,
    api.availableOptions$,
    api.invalidSelections$,
    api.dataLoading
  );
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  return (
    <div
      id={`control-popover-${api.uuid}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsList-control-popover`}
    >
      {field?.type !== 'boolean' && !displaySettings.hideActionBar && (
        <OptionsListPopoverActionBar
          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
        />
      )}
      <div
        data-test-subj={`optionsList-control-available-options`}
        data-option-count={loading ? 0 : Object.keys(availableOptions ?? {}).length}
        style={{ width: '100%', height: '100%' }}
      >
        <OptionsListPopoverSuggestions showOnlySelected={showOnlySelected} />
        {!showOnlySelected && invalidSelections && invalidSelections.size !== 0 && (
          <OptionsListPopoverInvalidSelections />
        )}
      </div>
      {!displaySettings.hideExclude && <OptionsListPopoverFooter />}
    </div>
  );
};
