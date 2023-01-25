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

import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover';
import { useOptionsList } from '../embeddable/options_list_embeddable';

import './options_list.scss';

export const OptionsListControl = ({ typeaheadSubject }: { typeaheadSubject: Subject<string> }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const resizeRef = useRef(null);
  const optionsList = useOptionsList();
  const dimensions = useResizeObserver(resizeRef.current);

  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const validSelections = optionsList.select((state) => state.componentState.validSelections);
  const selectedOptions = optionsList.select((state) => state.explicitInput.selectedOptions);
  const existsSelected = optionsList.select((state) => state.explicitInput.existsSelected);
  const controlStyle = optionsList.select((state) => state.explicitInput.controlStyle);
  const singleSelect = optionsList.select((state) => state.explicitInput.singleSelect);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);
  const exclude = optionsList.select((state) => state.explicitInput.exclude);
  const loading = optionsList.select((state) => state.output.loading);
  const id = optionsList.select((state) => state.explicitInput.id);

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
        onClick={() => setIsPopoverOpen((openState) => !openState)}
        isSelected={isPopoverOpen}
        numActiveFilters={validSelectionsCount}
        hasActiveFilters={Boolean(validSelectionsCount)}
      >
        {hasSelections || existsSelected
          ? selectionDisplayNode
          : OptionsListStrings.control.getPlaceholder()}
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
        closePopover={() => setIsPopoverOpen(false)}
        anchorClassName="optionsList__anchorOverride"
        aria-label={OptionsListStrings.popover.getAriaLabel(fieldName)}
      >
        <OptionsListPopover
          width={dimensions.width}
          isLoading={debouncedLoading}
          updateSearchString={updateSearchString}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
