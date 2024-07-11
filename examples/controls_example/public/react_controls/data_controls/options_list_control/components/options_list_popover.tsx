/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import React, { useState } from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ControlStateManager } from '../../../types';
import { OptionsListControlApi, OptionsListComponentState } from '../types';
import { OptionsListPopoverActionBar } from './options_list_popover_action_bar';
// import { OptionsListPopoverFooter } from './options_list_popover_footer';
import { OptionsListPopoverInvalidSelections } from './options_list_popover_invalid_selections';
import { OptionsListPopoverSuggestions } from './options_list_popover_suggestions';

export interface OptionsListPopoverProps {
  api: OptionsListControlApi;
  stateManager: ControlStateManager<OptionsListComponentState>;
}

export const OptionsListPopover = ({ api, stateManager }: OptionsListPopoverProps) => {
  const [field, availableOptions, invalidSelections, loading] = useBatchedPublishingSubjects(
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
      {field?.type !== 'boolean' && ( // !hideActionBar &&
        <OptionsListPopoverActionBar
          api={api}
          stateManager={stateManager}
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
        {/* {!showOnlySelected && invalidSelections && !isEmpty(invalidSelections) && (
          <OptionsListPopoverInvalidSelections />
        )} */}
      </div>
      {/* <OptionsListPopoverFooter isLoading={isLoading} /> */}
      {/* {!hideExclude && <OptionsListPopoverFooter isLoading={isLoading} />} */}
    </div>
  );
};
