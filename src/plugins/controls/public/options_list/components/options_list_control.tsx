/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import classNames from 'classnames';
import { debounce, isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiPopover, useResizeObserver } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover';
import { optionsListReducers } from '../options_list_reducers';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, OptionsListReduxState } from '../types';

import './options_list.scss';

export const OptionsListControl = ({
  typeaheadSubject,
  loadMoreSubject,
}: {
  typeaheadSubject: Subject<string>;
  loadMoreSubject: Subject<number>;
}) => {
  const resizeRef = useRef(null);
  const dimensions = useResizeObserver(resizeRef.current);

  // Redux embeddable Context
  const {
    useEmbeddableDispatch,
    actions: { replaceSelection, setSearchString, setPopoverOpen },
    useEmbeddableSelector: select,
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const validSelections = select((state) => state.componentState.validSelections);
  const isPopoverOpen = select((state) => state.componentState.popoverOpen);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const controlStyle = select((state) => state.explicitInput.controlStyle);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const fieldName = select((state) => state.explicitInput.fieldName);
  const exclude = select((state) => state.explicitInput.exclude);
  const id = select((state) => state.explicitInput.id);

  const placeholder = select((state) => state.explicitInput.placeholder);

  const loading = select((state) => state.output.loading);

  useEffect(() => {
    return () => {
      dispatch(setPopoverOpen(false)); // on unmount, close the popover
    };
  }, [dispatch, setPopoverOpen]);

  // debounce loading state so loading doesn't flash when user types
  const [debouncedLoading, setDebouncedLoading] = useState(true);
  const debounceSetLoading = useMemo(
    () =>
      debounce((latestLoading: boolean) => {
        setDebouncedLoading(latestLoading);
      }, 100),
    []
  );
  useEffect(() => debounceSetLoading(loading ?? false), [loading, debounceSetLoading]);

  // remove all other selections if this control is single select
  useEffect(() => {
    if (singleSelect && selectedOptions && selectedOptions?.length > 1) {
      dispatch(replaceSelection(selectedOptions[0]));
    }
  }, [selectedOptions, singleSelect, dispatch, replaceSelection]);

  const updateSearchString = useCallback(
    (newSearchString: string) => {
      typeaheadSubject.next(newSearchString);
      dispatch(setSearchString(newSearchString));
    },
    [typeaheadSubject, dispatch, setSearchString]
  );

  const loadMoreSuggestions = useCallback(
    (cardinality: number) => {
      loadMoreSubject.next(Math.min(cardinality, MAX_OPTIONS_LIST_REQUEST_SIZE));
    },
    [loadMoreSubject]
  );

  const { hasSelections, selectionDisplayNode, validSelectionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(validSelections) || !isEmpty(invalidSelections),
      validSelectionsCount: validSelections?.length,
      selectionDisplayNode: (
        <>
          {exclude && (
            <>
              <span className="optionsList__negateLabel">
                {existsSelected
                  ? OptionsListStrings.control.getExcludeExists()
                  : OptionsListStrings.control.getNegate()}
              </span>{' '}
            </>
          )}
          {existsSelected ? (
            <span className={`optionsList__existsFilter`}>
              {OptionsListStrings.controlAndPopover.getExists(+Boolean(exclude))}
            </span>
          ) : (
            <>
              {validSelections && (
                <span>{validSelections.join(OptionsListStrings.control.getSeparator())}</span>
              )}
              {invalidSelections && (
                <span className="optionsList__filterInvalid">
                  {invalidSelections.join(OptionsListStrings.control.getSeparator())}
                </span>
              )}
            </>
          )}
        </>
      ),
    };
  }, [exclude, existsSelected, validSelections, invalidSelections]);

  const button = (
    <div className="optionsList--filterBtnWrapper" ref={resizeRef}>
      <EuiFilterButton
        iconType="arrowDown"
        isLoading={debouncedLoading}
        className={classNames('optionsList--filterBtn', {
          'optionsList--filterBtnSingle': controlStyle !== 'twoLine',
          'optionsList--filterBtnPlaceholder': !hasSelections,
        })}
        data-test-subj={`optionsList-control-${id}`}
        onClick={() => dispatch(setPopoverOpen(!isPopoverOpen))}
        isSelected={isPopoverOpen}
        numActiveFilters={validSelectionsCount}
        hasActiveFilters={Boolean(validSelectionsCount)}
      >
        {hasSelections || existsSelected
          ? selectionDisplayNode
          : placeholder ?? OptionsListStrings.control.getPlaceholder()}
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
        ownFocus
        button={button}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        className="optionsList__popoverOverride"
        closePopover={() => dispatch(setPopoverOpen(false))}
        anchorClassName="optionsList__anchorOverride"
        aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
      >
        <OptionsListPopover
          width={dimensions.width}
          isLoading={debouncedLoading}
          updateSearchString={updateSearchString}
          loadMoreSuggestions={loadMoreSuggestions}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
