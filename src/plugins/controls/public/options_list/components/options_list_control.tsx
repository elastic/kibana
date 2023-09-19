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

import { MAX_OPTIONS_LIST_REQUEST_SIZE } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover';
import { useOptionsList } from '../embeddable/options_list_embeddable';

import './options_list.scss';
import { ControlError } from '../../control_group/component/control_error_component';

export const OptionsListControl = ({
  typeaheadSubject,
  loadMoreSubject,
}: {
  typeaheadSubject: Subject<string>;
  loadMoreSubject: Subject<number>;
}) => {
  const resizeRef = useRef(null);
  const optionsList = useOptionsList();
  const dimensions = useResizeObserver(resizeRef.current);

  const error = optionsList.select((state) => state.componentState.error);
  const isPopoverOpen = optionsList.select((state) => state.componentState.popoverOpen);
  const validSelections = optionsList.select((state) => state.componentState.validSelections);
  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);

  const id = optionsList.select((state) => state.explicitInput.id);
  const exclude = optionsList.select((state) => state.explicitInput.exclude);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);
  const placeholder = optionsList.select((state) => state.explicitInput.placeholder);
  const controlStyle = optionsList.select((state) => state.explicitInput.controlStyle);
  const singleSelect = optionsList.select((state) => state.explicitInput.singleSelect);
  const existsSelected = optionsList.select((state) => state.explicitInput.existsSelected);
  const selectedOptions = optionsList.select((state) => state.explicitInput.selectedOptions);

  const loading = optionsList.select((state) => state.output.loading);

  useEffect(() => {
    return () => {
      optionsList.dispatch.setPopoverOpen(false); // on unmount, close the popover
    };
  }, [optionsList]);

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
      optionsList.dispatch.replaceSelection(selectedOptions[0]);
    }
  }, [selectedOptions, singleSelect, optionsList.dispatch]);

  const updateSearchString = useCallback(
    (newSearchString: string) => {
      typeaheadSubject.next(newSearchString);
      optionsList.dispatch.setSearchString(newSearchString);
    },
    [typeaheadSubject, optionsList.dispatch]
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
        badgeColor="success"
        iconType="arrowDown"
        isLoading={debouncedLoading}
        className={classNames('optionsList--filterBtn', {
          'optionsList--filterBtnSingle': controlStyle !== 'twoLine',
          'optionsList--filterBtnPlaceholder': !hasSelections,
        })}
        data-test-subj={`optionsList-control-${id}`}
        onClick={() => optionsList.dispatch.setPopoverOpen(!isPopoverOpen)}
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

  return error ? (
    <ControlError error={error} />
  ) : (
    <EuiFilterGroup
      className={classNames('optionsList--filterGroup', {
        'optionsList--filterGroupSingle': controlStyle !== 'twoLine',
      })}
    >
      <EuiPopover
        ownFocus
        button={button}
        hasArrow={false}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        initialFocus={'[data-test-subj=optionsList-control-search-input]'}
        closePopover={() => optionsList.dispatch.setPopoverOpen(false)}
        aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
        panelClassName="optionsList__popoverOverride"
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
