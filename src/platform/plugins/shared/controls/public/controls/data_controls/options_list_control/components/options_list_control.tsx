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
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiToken,
  EuiToolTip,
  UseEuiTheme,
  htmlIdGenerator,
} from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { isCompressed } from '../../../../control_group/utils/is_compressed';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { MIN_POPOVER_WIDTH } from '../../../constants';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListPopover } from './options_list_popover';
import { OptionsListStrings } from '../options_list_strings';

const optionListControlStyles = {
  selectionWrapper: css({ overflow: 'hidden !important' }),
  excludeSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: euiTheme.size.m,
      fontWeight: euiTheme.font.weight.bold,
      color: euiTheme.colors.danger,
    }),
  validOption: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.text,
      fontWeight: euiTheme.font.weight.medium,
    }),
  invalidOption: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.warningText,
      fontWeight: euiTheme.font.weight.medium,
    }),
  optionsListExistsFilter: ({ euiTheme }: UseEuiTheme) => css`
    font-style: italic;
    font-weight: ${euiTheme.font.weight.medium};
  `,
  invalidSelectionsToken: css({ verticalAlign: 'text-bottom' }),
  filterButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: `${euiTheme.font.weight.regular} !important` as 'normal',
      color: `${euiTheme.colors.subduedText} !important`,
      '&:hover::before': {
        background: `${euiTheme.colors.backgroundBaseSubdued} !important`,
      },
    }),
  filterButtonText: css({
    flexGrow: 1,
    textAlign: 'left',
  }),
  inputButtonOverride: css({
    maxInlineSize: '100% !important',
    '.euiButtonEmpty': {
      borderEndStartRadius: '0 !important',
      borderStartStartRadius: '0 !important',
    },
  }),
  /* additional custom overrides due to unexpected component usage;
    open issue: https://github.com/elastic/eui-private/issues/270 */
  filterGroup: css`
    /* prevents duplicate border due to nested filterGroup */
    &::after {
      display: none;
    }

    .euiFilterButton__wrapper {
      padding: 0;

      &::before,
      &::after {
        display: none;
      }
    }
  `,
};

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
  const styles = useMemoCss(optionListControlStyles);

  const { hasSelections, selectionDisplayNode, selectedOptionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(selectedOptions),
      selectedOptionsCount: selectedOptions?.length,
      selectionDisplayNode: (
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
          <EuiFlexItem css={styles.selectionWrapper} data-test-subj="optionsListSelections">
            <div className="eui-textTruncate">
              {excludeSelected && (
                <>
                  <span css={styles.excludeSelected}>
                    {existsSelected
                      ? OptionsListStrings.control.getExcludeExists()
                      : OptionsListStrings.control.getNegate()}
                  </span>{' '}
                </>
              )}
              {existsSelected ? (
                <span css={styles.optionsListExistsFilter}>
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
                            css={isInvalid ? styles.invalidOption : styles.validOption}
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
                  css={styles.invalidSelectionsToken} // Align with the notification badge
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
    styles,
  ]);

  const button = (
    <EuiFilterButton
      badgeColor="success"
      iconType={loading ? 'empty' : 'arrowDown'}
      data-test-subj={`optionsList-control-${componentApi.uuid}`}
      css={styles.filterButton}
      onClick={() => setPopoverOpen(!isPopoverOpen)}
      isSelected={isPopoverOpen}
      numActiveFilters={selectedOptionsCount}
      hasActiveFilters={Boolean(selectedOptionsCount)}
      textProps={{ css: styles.filterButtonText }}
      aria-label={panelTitle ?? defaultPanelTitle}
      aria-expanded={isPopoverOpen}
      aria-controls={popoverId}
      role="combobox"
    >
      {hasSelections || existsSelected
        ? selectionDisplayNode
        : displaySettings.placeholder ?? OptionsListStrings.control.getPlaceholder()}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup
      fullWidth
      compressed={isCompressed(componentApi)}
      className={controlPanelClassName}
      css={optionListControlStyles.filterGroup}
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
        css={styles.inputButtonOverride}
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
