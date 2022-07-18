/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFilterButton, EuiFilterGroup, EuiPopover, useResizeObserver } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import classNames from 'classnames';
import { debounce, isEmpty } from 'lodash';

import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from './options_list_reducers';
import { OptionsListPopover } from './options_list_popover_component';

import './options_list.scss';
import { useStateObservable } from '../../hooks/use_state_observable';
import { OptionsListEmbeddableInput } from './types';

// OptionsListComponentState is controlled by the embeddable, but is not considered embeddable input.
export interface OptionsListComponentState {
  loading: boolean;
  field?: DataViewField;
  totalCardinality?: number;
  availableOptions?: string[];
  invalidSelections?: string[];
  validSelections?: string[];
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

  const resizeRef = useRef(null);
  const dimensions = useResizeObserver(resizeRef.current);

  // Redux embeddable Context to get state from Embeddable input
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector,
    actions: { replaceSelection },
  } = useReduxEmbeddableContext<OptionsListEmbeddableInput, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();
  const { controlStyle, selectedOptions, singleSelect, id } = useEmbeddableSelector(
    (state) => state
  );

  // useStateObservable to get component state from Embeddable
  const { availableOptions, loading, invalidSelections, validSelections, totalCardinality, field } =
    useStateObservable<OptionsListComponentState>(
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

  const { hasSelections, selectionDisplayNode, validSelectionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(validSelections) || !isEmpty(invalidSelections),
      validSelectionsCount: validSelections?.length,
      selectionDisplayNode: (
        <>
          {validSelections && (
            <span>{validSelections?.join(OptionsListStrings.summary.getSeparator())}</span>
          )}
          {invalidSelections && (
            <span className="optionsList__filterInvalid">
              {invalidSelections.join(OptionsListStrings.summary.getSeparator())}
            </span>
          )}
        </>
      ),
    };
  }, [validSelections, invalidSelections]);

  const button = (
    <div className="optionsList--filterBtnWrapper" ref={resizeRef}>
      <EuiFilterButton
        iconType="arrowDown"
        isLoading={buttonLoading}
        className={classNames('optionsList--filterBtn', {
          'optionsList--filterBtnSingle': controlStyle !== 'twoLine',
          'optionsList--filterBtnPlaceholder': !hasSelections,
        })}
        data-test-subj={`optionsList-control-${id}`}
        onClick={() => setIsPopoverOpen((openState) => !openState)}
        isSelected={isPopoverOpen}
        numActiveFilters={validSelectionsCount}
        hasActiveFilters={Boolean(validSelectionsCount)}
      >
        {hasSelections ? selectionDisplayNode : OptionsListStrings.summary.getPlaceholder()}
      </EuiFilterButton>
    </div>
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
          field={field}
          width={dimensions.width}
          loading={loading}
          searchString={searchString}
          totalCardinality={totalCardinality}
          availableOptions={availableOptions}
          invalidSelections={invalidSelections}
          updateSearchString={updateSearchString}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
