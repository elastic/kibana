/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFilterButton, EuiFilterGroup, EuiPopover } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { Subject } from 'rxjs';

import { useReduxEmbeddableContext } from '../../../redux_embeddables/redux_embeddable_context';
import { OptionsListEmbeddableInput } from './options_list_embeddable';
import { OptionsListPopover } from './options_list_popover_component';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListStrings } from './options_list_strings';

import './options_list.scss';
import { useStateObservable } from '../../hooks/use_state_observable';

// Availableoptions and loading state is controled by the embeddable, but is not considered embeddable input.
export interface OptionsListComponentState {
  availableOptions?: string[];
  loading: boolean;
}

export const OptionsListComponent = ({
  typeaheadSubject,
  componentStateSubject,
}: {
  typeaheadSubject: Subject<string>;
  componentStateSubject: Subject<OptionsListComponentState>;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchString, setSearchString] = useState('');

  // Redux embeddable Context to get state from Embeddable input
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector,
    actions: { replaceSelection },
  } = useReduxEmbeddableContext<OptionsListEmbeddableInput, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();
  const { twoLineLayout, selectedOptions, singleSelect } = useEmbeddableSelector((state) => state);

  // useStateObservable to get component state from Embeddable
  const { availableOptions, loading } = useStateObservable<OptionsListComponentState>(
    componentStateSubject,
    {
      loading: true,
    }
  );

  // remove all other selections if this control is single select
  useEffect(() => {
    if (singleSelect && selectedOptions && selectedOptions?.length > 1) {
      dispatch(replaceSelection(selectedOptions[0]));
    }
  }, [selectedOptions, singleSelect, dispatch, replaceSelection]);

  const updateSearchString = useCallback(
    (newSearchString: string) => {
      typeaheadSubject.next(newSearchString);
      setSearchString(newSearchString);
    },
    [typeaheadSubject]
  );

  const { selectedOptionsCount, selectedOptionsString } = useMemo(() => {
    return {
      selectedOptionsCount: selectedOptions?.length,
      selectedOptionsString: selectedOptions?.join(OptionsListStrings.summary.getSeparator()),
    };
  }, [selectedOptions]);

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      className={classNames('optionsList--filterBtn', {
        'optionsList--filterBtnSingle': !twoLineLayout,
        'optionsList--filterBtnPlaceholder': !selectedOptionsCount,
      })}
      onClick={() => setIsPopoverOpen((openState) => !openState)}
      isSelected={isPopoverOpen}
      numFilters={availableOptions?.length ?? 0} // Remove this once https://github.com/elastic/eui/pull/5268 is in an EUI release
      numActiveFilters={selectedOptionsCount}
      hasActiveFilters={(selectedOptionsCount ?? 0) > 0}
    >
      {!selectedOptionsCount ? OptionsListStrings.summary.getPlaceholder() : selectedOptionsString}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup
      className={classNames('optionsList--filterGroup', {
        'optionsList--filterGroupSingle': !twoLineLayout,
      })}
    >
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        className="optionsList--popoverOverride"
        anchorClassName="optionsList--anchorOverride"
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        ownFocus
        repositionOnScroll
      >
        <OptionsListPopover
          loading={loading}
          searchString={searchString}
          updateSearchString={updateSearchString}
          availableOptions={availableOptions}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
