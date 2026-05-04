/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  type EuiBadgeProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiCopy,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  actionFilterForText,
  actionFilterOutText,
  closeCellActionPopoverText,
  copyValueAriaText,
  copyValueText,
  filterForText,
  filterOutText,
  openCellActionPopoverAriaText,
} from './translations';
import { truncateReactNode } from './utils';

interface CellActionsPopoverProps {
  onFilter?: DocViewFilterFn;
  /** ECS mapping for the key */
  property?: DataViewField;
  name: string;
  /** Formatted value from field formatter (React node) */
  formattedValue: ReactNode;
  /** Plain text version of the value for copying to clipboard */
  textValue: string;
  /** The raw value from the mapping, can be an object */
  rawValue: unknown;
  /** Optional callback to customize rendering of the formatted value */
  renderFormattedValue?: (formattedValue: ReactNode) => ReactNode;
  /** Props to forward to the trigger Badge */
  renderPopoverTrigger: (props: {
    popoverTriggerProps: {
      onClick: () => void;
      onClickAriaLabel: string;
      'data-test-subj': string;
    };
  }) => ReactElement;
}

export function CellActionsPopover({
  onFilter,
  property,
  name,
  formattedValue,
  textValue,
  rawValue,
  renderFormattedValue,
  renderPopoverTrigger,
}: CellActionsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);

  const makeFilterHandlerByOperator = (operator: '+' | '-') => () => {
    if (onFilter) {
      onFilter(property ?? name, rawValue, operator);
      closePopover();
    }
  };

  const popoverTriggerProps = {
    onClick: togglePopover,
    onClickAriaLabel: openCellActionPopoverAriaText,
    'data-test-subj': `dataTableCellActionsPopover_${name}`,
  };

  return (
    <EuiPopover
      button={renderPopoverTrigger({ popoverTriggerProps })}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="s"
    >
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        data-test-subj="dataTableCellActionPopoverTitle"
      >
        <EuiFlexItem style={{ maxWidth: '400px' }}>
          <EuiText
            size="s"
            className="eui-textBreakWord"
            css={css`
              font-family: ${euiTheme.font.familyCode};
            `}
          >
            <strong>{name}</strong>{' '}
            {typeof renderFormattedValue === 'function' ? (
              <>{renderFormattedValue(formattedValue)}</>
            ) : rawValue != null && typeof rawValue !== 'object' ? (
              <>{rawValue as ReactNode}</>
            ) : (
              <span>{formattedValue}</span>
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={closeCellActionPopoverText}
            data-test-subj="dataTableExpandCellActionPopoverClose"
            iconSize="s"
            iconType="cross"
            size="xs"
            onClick={closePopover}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {onFilter ? (
        <EuiPopoverFooter>
          <EuiFlexGroup responsive={false} gutterSize="s" wrap={true}>
            <EuiButtonEmpty
              key="addToFilterAction"
              size="s"
              iconType="plusCircle"
              aria-label={actionFilterForText(textValue)}
              onClick={makeFilterHandlerByOperator('+')}
              data-test-subj={`dataTableCellAction_addToFilterAction_${name}`}
            >
              {filterForText}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              key="removeFromFilterAction"
              size="s"
              iconType="minusCircle"
              aria-label={actionFilterOutText(textValue)}
              onClick={makeFilterHandlerByOperator('-')}
              data-test-subj={`dataTableCellAction_removeFromFilterAction_${name}`}
            >
              {filterOutText}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      ) : null}
      <EuiPopoverFooter>
        <EuiCopy textToCopy={textValue}>
          {(copy) => (
            <EuiButtonEmpty
              key="copyToClipboardAction"
              size="s"
              iconType="copy"
              aria-label={copyValueAriaText(name)}
              onClick={copy}
              data-test-subj={`dataTableCellAction_copyToClipboardAction_${name}`}
            >
              {copyValueText}
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}

export interface FieldBadgeWithActionsProps
  extends Pick<
    CellActionsPopoverProps,
    | 'onFilter'
    | 'name'
    | 'property'
    | 'formattedValue'
    | 'textValue'
    | 'rawValue'
    | 'renderFormattedValue'
  > {
  icon?: EuiBadgeProps['iconType'];
  color?: string;
  truncateTitle?: boolean;
}

interface FieldBadgeWithActionsDependencies {
  core?: CoreStart;
  share?: SharePluginStart;
}

export type FieldBadgeWithActionsPropsAndDependencies = FieldBadgeWithActionsProps &
  FieldBadgeWithActionsDependencies;

export function FieldBadgeWithActions({
  icon,
  onFilter,
  name,
  property,
  renderFormattedValue,
  formattedValue,
  textValue,
  rawValue,
  color = 'hollow',
  truncateTitle = false,
}: FieldBadgeWithActionsPropsAndDependencies) {
  const MAX_LENGTH = 20;

  const displayValue = useMemo(
    () =>
      truncateTitle ? truncateReactNode(formattedValue, MAX_LENGTH, textValue) : formattedValue,
    [truncateTitle, formattedValue, textValue]
  );

  return (
    <CellActionsPopover
      onFilter={onFilter}
      name={name}
      property={property}
      formattedValue={formattedValue}
      textValue={textValue}
      rawValue={rawValue}
      renderFormattedValue={renderFormattedValue}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <EuiBadge
          {...popoverTriggerProps}
          color={color}
          iconType={icon}
          iconSide="left"
          title={textValue}
        >
          <span>{displayValue}</span>
        </EuiBadge>
      )}
    />
  );
}
