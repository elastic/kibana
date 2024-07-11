/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce, isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Subject } from 'rxjs';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiToken,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { ControlStateManager } from '../../../types';
import { MAX_OPTIONS_LIST_REQUEST_SIZE, MIN_POPOVER_WIDTH } from '../constants';
import { OptionsListComponentState, OptionsListControlApi } from '../types';
import './options_list.scss';
import { OptionsListPopover } from './options_list_popover';
import { OptionsListStrings } from './options_list_strings';
import classNames from 'classnames';

export const OptionsListControl = ({
  api,
  stateManager,
  ...rest
}: {
  api: OptionsListControlApi;
  stateManager: ControlStateManager<OptionsListComponentState>;
}) => {
  const popoverId = useMemo(() => htmlIdGenerator()(), []);

  const [isPopoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [
    excludeSelected,
    existsSelected,
    singleSelect,
    selectedOptions,
    invalidSelections,
    dataViews,
    fieldSpec,
    loading,
    panelTitle,
  ] = useBatchedPublishingSubjects(
    stateManager.exclude,
    stateManager.existsSelected,
    stateManager.singleSelect,
    stateManager.selectedOptions,
    api.invalidSelections$,
    api.dataViews,
    api.fieldSpec,
    api.dataLoading,
    api.panelTitle
  );
  const [defaultPanelTitle] = useBatchedOptionalPublishingSubjects(api.defaultPanelTitle);

  // const placeholder = optionsList.select((state) => state.explicitInput.placeholder);
  // const controlStyle = optionsList.select((state) => state.explicitInput.controlStyle);

  // TODO: Better field formatter
  const fieldFormatter = useMemo(() => {
    const dataView = dataViews?.[0];
    return dataView && fieldSpec
      ? dataView.getFormatterForField(fieldSpec).getConverterFor('text')
      : (toFormat: string) => toFormat;
  }, [fieldSpec, dataViews]);

  // // remove all other selections if this control is single select
  // useEffect(() => {
  //   if (singleSelect && selectedOptions && selectedOptions?.length > 1) {
  //     stateManager.selectedOptions.next([selectedOptions[0]]);
  //   }
  // }, [singleSelect, selectedOptions, stateManager.selectedOptions]);

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
              {excludeSelected && (
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
                  {OptionsListStrings.controlAndPopover.getExists(+Boolean(excludeSelected))}
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
  }, [
    selectedOptions,
    excludeSelected,
    existsSelected,
    fieldFormatter,
    delimiter,
    invalidSelections,
  ]);

  const button = (
    <>
      <EuiFilterButton
        badgeColor="success"
        iconType={loading ? 'empty' : 'arrowDown'}
        className={classNames('optionsList--filterBtn', {
          'optionsList--filterBtnPlaceholder': !hasSelections,
        })}
        data-test-subj={`optionsList-control-${api.uuid}`}
        onClick={() => setPopoverOpen(!isPopoverOpen)}
        isSelected={isPopoverOpen}
        numActiveFilters={selectedOptionsCount}
        hasActiveFilters={Boolean(selectedOptionsCount)}
        textProps={{ className: 'optionsList--selectionText' }}
        aria-label={panelTitle ?? defaultPanelTitle}
        aria-expanded={isPopoverOpen}
        aria-controls={popoverId}
        role="combobox"
      >
        {hasSelections || existsSelected
          ? selectionDisplayNode
          : OptionsListStrings.control.getPlaceholder()}
        {/* : placeholder ?? OptionsListStrings.control.getPlaceholder()} */}
      </EuiFilterButton>
    </>
  );

  return (
    <EuiFilterGroup
      fullWidth
      {...rest}
      // className={classNames('optionsList--filterGroup', {
      //   'optionsList--filterGroupSingle': controlStyle !== 'twoLine',
      // })}
    >
      <EuiInputPopover
        id={popoverId}
        ownFocus
        input={button}
        hasArrow={false}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        panelMinWidth={MIN_POPOVER_WIDTH}
        className="optionsList__inputButtonOverride"
        initialFocus={'[data-test-subj=optionsList-control-search-input]'}
        closePopover={() => setPopoverOpen(false)}
        panelClassName="optionsList__popoverOverride"
        // panelProps={{
        //   'aria-label': OptionsListStrings.popover.getAriaLabel(panelTitle ?? defaultPanelTitle!),
        // }}
      >
        <OptionsListPopover api={api} stateManager={stateManager} />
      </EuiInputPopover>
    </EuiFilterGroup>
  );
};
