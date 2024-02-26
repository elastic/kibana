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
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';

import { MAX_OPTIONS_LIST_REQUEST_SIZE } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover';
import { useOptionsList } from '../embeddable/options_list_embeddable';

import './options_list.scss';
import { ControlError } from '../../control_group/component/control_error_component';
import { MIN_POPOVER_WIDTH } from '../../constants';
import { useFieldFormatter } from '../../hooks/use_field_formatter';

export const OptionsListControl = ({
  typeaheadSubject,
  loadMoreSubject,
}: {
  typeaheadSubject: Subject<string>;
  loadMoreSubject: Subject<number>;
}) => {
  const optionsList = useOptionsList();

  const error = optionsList.select((state) => state.componentState.error);
  const isPopoverOpen = optionsList.select((state) => state.componentState.popoverOpen);
  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);
  const fieldSpec = optionsList.select((state) => state.componentState.field);

  const id = optionsList.select((state) => state.explicitInput.id);
  const exclude = optionsList.select((state) => state.explicitInput.exclude);
  const fieldName = optionsList.select((state) => state.explicitInput.fieldName);
  const placeholder = optionsList.select((state) => state.explicitInput.placeholder);
  const controlStyle = optionsList.select((state) => state.explicitInput.controlStyle);
  const singleSelect = optionsList.select((state) => state.explicitInput.singleSelect);
  const existsSelected = optionsList.select((state) => state.explicitInput.existsSelected);
  const selectedOptions = optionsList.select((state) => state.explicitInput.selectedOptions);

  const loading = optionsList.select((state) => state.output.loading);
  const dataViewId = optionsList.select((state) => state.output.dataViewId);
  const fieldFormatter = useFieldFormatter({ dataViewId, fieldSpec });

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

  const delimiter = useMemo(
    () => OptionsListStrings.control.getSeparator(fieldSpec?.type),
    [fieldSpec?.type]
  );

  const { hasSelections, selectionDisplayNode, selectedOptionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(selectedOptions),
      selectedOptionsCount: selectedOptions?.length,
      selectionDisplayNode: (
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
          <EuiFlexItem className="optionsList__selections">
            <div className="eui-textTruncate">
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
                  {selectedOptions?.length
                    ? selectedOptions.map((value: string, i, { length }) => {
                        const text = `${fieldFormatter(value)}${
                          i + 1 === length ? '' : delimiter
                        } `;
                        const isInvalid = invalidSelections?.includes(value);
                        return (
                          <span
                            className={`optionsList__filter ${
                              isInvalid ? 'optionsList__filterInvalid' : ''
                            }`}
                          >
                            {text}
                          </span>
                        );
                      })
                    : null}
                </>
              )}
            </div>
          </EuiFlexItem>
          {invalidSelections && invalidSelections.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={OptionsListStrings.control.getInvalidSelectionWarningLabel(
                  invalidSelections.length
                )}
                delay="long"
              >
                <EuiToken
                  tabIndex={0}
                  iconType="alert"
                  size="s"
                  color="euiColorVis5"
                  shape="square"
                  fill="dark"
                  title={OptionsListStrings.control.getInvalidSelectionWarningLabel(
                    invalidSelections.length
                  )}
                  css={{ verticalAlign: 'text-bottom' }} // Align with the notification badge
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    };
  }, [selectedOptions, exclude, existsSelected, fieldFormatter, delimiter, invalidSelections]);

  const button = (
    <>
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
        numActiveFilters={selectedOptionsCount}
        hasActiveFilters={Boolean(selectedOptionsCount)}
        aria-label={`${selectedOptions
          ?.map((value) => {
            const isInvalid = invalidSelections?.includes(value);
            return `${
              isInvalid
                ? OptionsListStrings.popover.getInvalidSelectionScreenReaderText() + ' '
                : ''
            }${fieldFormatter(value)}`;
          })
          .join(delimiter)}`}
        textProps={{ className: 'optionsList--selectionText' }}
      >
        {hasSelections || existsSelected
          ? selectionDisplayNode
          : placeholder ?? OptionsListStrings.control.getPlaceholder()}
      </EuiFilterButton>
    </>
  );

  return error ? (
    <ControlError error={error} />
  ) : (
    <EuiFilterGroup
      className={classNames('optionsList--filterGroup', {
        'optionsList--filterGroupSingle': controlStyle !== 'twoLine',
      })}
    >
      <EuiInputPopover
        ownFocus
        input={button}
        hasArrow={false}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        panelMinWidth={MIN_POPOVER_WIDTH}
        className="optionsList__inputButtonOverride"
        initialFocus={'[data-test-subj=optionsList-control-search-input]'}
        closePopover={() => optionsList.dispatch.setPopoverOpen(false)}
        panelClassName="optionsList__popoverOverride"
        panelProps={{ 'aria-label': OptionsListStrings.popover.getAriaLabel(fieldName) }}
      >
        <OptionsListPopover
          isLoading={debouncedLoading}
          updateSearchString={updateSearchString}
          loadMoreSuggestions={loadMoreSuggestions}
        />
      </EuiInputPopover>
    </EuiFilterGroup>
  );
};
