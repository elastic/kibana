/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import React, { useMemo, useState } from 'react';
import classNames from 'classnames';

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
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { BehaviorSubject } from 'rxjs';
import { isCompressed } from '../../../../control_group/utils/is_compressed';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { MIN_POPOVER_WIDTH } from '../../../constants';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopover } from './options_list_popover';
import { OptionsListStrings } from '../options_list_strings';

import './options_list.scss';

export const OptionsListControl = ({
  controlPanelClassName,
}: {
  controlPanelClassName: string;
}) => {
  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const { componentApi, displaySettings } = useOptionsListContext();

  const [isPopoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [
    excludeSelected,
    existsSelected,
    selectedOptions,
    invalidSelections,
    field,
    loading,
    panelTitle,
    fieldFormatter,
    defaultPanelTitle,
  ] = useBatchedPublishingSubjects(
    componentApi.exclude$,
    componentApi.existsSelected$,
    componentApi.selectedOptions$,
    componentApi.invalidSelections$,
    componentApi.field$,
    componentApi.dataLoading$,
    componentApi.title$,
    componentApi.fieldFormatter,
    componentApi.defaultTitle$ ?? new BehaviorSubject(undefined)
  );

  const delimiter = useMemo(() => OptionsListStrings.control.getSeparator(field?.type), [field]);

  const { hasSelections, selectionDisplayNode, selectedOptionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(selectedOptions),
      selectedOptionsCount: selectedOptions?.length,
      selectionDisplayNode: (
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
          <EuiFlexItem className="optionsList__selections" data-test-subj="optionsListSelections">
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
                    ? selectedOptions.map((value: OptionsListSelection, i, { length }) => {
                        const text = `${fieldFormatter(value)}${
                          i + 1 === length ? '' : delimiter
                        } `;
                        const isInvalid = invalidSelections?.has(value);
                        return (
                          <span
                            key={value}
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
          {invalidSelections && invalidSelections.size > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={OptionsListStrings.control.getInvalidSelectionWarningLabel(
                  invalidSelections.size
                )}
                delay="long"
              >
                <EuiToken
                  tabIndex={0}
                  iconType="alert"
                  size="s"
                  color="euiColorVis9"
                  shape="square"
                  fill="dark"
                  title={OptionsListStrings.control.getInvalidSelectionWarningLabel(
                    invalidSelections.size
                  )}
                  data-test-subj={`optionsList__invalidSelectionsToken-${componentApi.uuid}`}
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
    componentApi.uuid,
  ]);

  const button = (
    <>
      <EuiFilterButton
        badgeColor="success"
        iconType={loading ? 'empty' : 'arrowDown'}
        className={'optionsList--filterBtn'}
        data-test-subj={`optionsList-control-${componentApi.uuid}`}
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
          : displaySettings.placeholder ?? OptionsListStrings.control.getPlaceholder()}
      </EuiFilterButton>
    </>
  );

  return (
    <EuiFilterGroup
      fullWidth
      compressed={isCompressed(componentApi)}
      className={classNames('optionsList__filterGroup', controlPanelClassName)}
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
        panelProps={{
          title: panelTitle ?? defaultPanelTitle,
          'aria-label': OptionsListStrings.popover.getAriaLabel(panelTitle ?? defaultPanelTitle!),
        }}
      >
        <OptionsListPopover />
      </EuiInputPopover>
    </EuiFilterGroup>
  );
};
