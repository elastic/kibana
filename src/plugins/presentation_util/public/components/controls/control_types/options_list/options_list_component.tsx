/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFilterButton, EuiFilterGroup, EuiPopover } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import classNames from 'classnames';
import { debounce } from 'lodash';

import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListPopover } from './options_list_popover_component';
import { useReduxEmbeddableContext } from '../../../redux_embeddables/redux_embeddable_context';

import './options_list.scss';
import { useStateObservable } from '../../hooks/use_state_observable';
import { OptionsListEmbeddableInput } from './types';

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
  componentStateSubject: BehaviorSubject<OptionsListComponentState>;
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
  const { controlStyle, selectedOptions, singleSelect } = useEmbeddableSelector((state) => state);

  // useStateObservable to get component state from Embeddable
  const { availableOptions, loading } = useStateObservable<OptionsListComponentState>(
    componentStateSubject,
    componentStateSubject.getValue()
  );

  // debounce loading state so loading doesn't flash when user types
  const [buttonLoading, setButtonLoading] = useState(true);
  const debounceSetButtonLoading = useMemo(
    () => debounce((latestLoading: boolean) => setButtonLoading(latestLoading), 100),
    []
  );
  useEffect(() => debounceSetButtonLoading(loading), [loading, debounceSetButtonLoading]);

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
      isLoading={buttonLoading}
      className={classNames('optionsList--filterBtn', {
        'optionsList--filterBtnSingle': controlStyle !== 'twoLine',
        'optionsList--filterBtnPlaceholder': !selectedOptionsCount,
      })}
      onClick={() => setIsPopoverOpen((openState) => !openState)}
      isSelected={isPopoverOpen}
      numActiveFilters={selectedOptionsCount}
      hasActiveFilters={(selectedOptionsCount ?? 0) > 0}
    >
      {!selectedOptionsCount ? OptionsListStrings.summary.getPlaceholder() : selectedOptionsString}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup
      className={classNames('optionsList--filterGroup', {
        'optionsList--filterGroupSingle': controlStyle !== 'twoLine',
      })}
    >
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        className="optionsList__popoverOverride"
        anchorClassName="optionsList__anchorOverride"
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
