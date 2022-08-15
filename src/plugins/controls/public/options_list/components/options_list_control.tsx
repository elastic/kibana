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
import { OptionsListReduxState } from '../types';

import './options_list.scss';

export const OptionsListControl = ({ typeaheadSubject }: { typeaheadSubject: Subject<string> }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const resizeRef = useRef(null);
  const dimensions = useResizeObserver(resizeRef.current);

  // Redux embeddable Context
  const {
    useEmbeddableDispatch,
    actions: { replaceSelection, setSearchString },
    useEmbeddableSelector: select,
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const validSelections = select((state) => state.componentState.validSelections);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const controlStyle = select((state) => state.explicitInput.controlStyle);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const id = select((state) => state.explicitInput.id);

  const loading = select((state) => state.output.loading);

  // debounce loading state so loading doesn't flash when user types
  const [buttonLoading, setButtonLoading] = useState(true);
  const debounceSetButtonLoading = useMemo(
    () => debounce((latestLoading: boolean) => setButtonLoading(latestLoading), 100),
    []
  );
  useEffect(() => debounceSetButtonLoading(loading ?? false), [loading, debounceSetButtonLoading]);

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

  const { hasSelections, selectionDisplayNode, validSelectionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(validSelections) || !isEmpty(invalidSelections),
      validSelectionsCount: validSelections?.length,
      selectionDisplayNode: (
        <>
          {validSelections && (
            <span>{validSelections?.join(OptionsListStrings.control.getSeparator())}</span>
          )}
          {invalidSelections && (
            <span className="optionsList__filterInvalid">
              {invalidSelections.join(OptionsListStrings.control.getSeparator())}
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
        {hasSelections ? selectionDisplayNode : OptionsListStrings.control.getPlaceholder()}
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
      >
        <OptionsListPopover width={dimensions.width} updateSearchString={updateSearchString} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
