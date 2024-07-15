/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ControlStateManager } from '../../../types';
import {
  OptionsListComponentApi,
  OptionsListComponentState,
  OptionsListDisplaySettings,
} from '../types';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
// import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';
import { OptionsListPopoverFooter } from './options_list_popover_footer';

export interface OptionsListPopoverProps {
  api: OptionsListComponentApi;
  stateManager: ControlStateManager<OptionsListComponentState>;
  displaySettings: OptionsListDisplaySettings;
}

export const OptionsListPopover = ({
  api,
  stateManager,
  displaySettings,
}: OptionsListPopoverProps) => {
  const [fieldSpec, availableOptions, invalidSelections, loading] = useBatchedPublishingSubjects(
    api.fieldSpec,
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
      {fieldSpec?.type !== 'boolean' && !displaySettings.hideActionBar && (
        <OptionsListPopoverActionBar
          api={api}
          stateManager={stateManager}
          displaySettings={displaySettings}
          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
        />
      )}
      <div
        data-test-subj={`optionsList-control-available-options`}
        data-option-count={loading ? 0 : Object.keys(availableOptions ?? {}).length}
        style={{ width: '100%', height: '100%' }}
      >
        <OptionsListPopoverSuggestions
          api={api}
          stateManager={stateManager}
          showOnlySelected={showOnlySelected}
        />
        {!showOnlySelected && invalidSelections && invalidSelections.size !== 0 && (
          <OptionsListPopoverInvalidSelections api={api} />
        )}
      </div>
      {!displaySettings.hideExclude && (
        <OptionsListPopoverFooter api={api} stateManager={stateManager} />
      )}
    </div>
  );
};
