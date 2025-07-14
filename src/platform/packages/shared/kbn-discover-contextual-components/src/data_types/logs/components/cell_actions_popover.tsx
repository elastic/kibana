/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
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
import { truncateAndPreserveHighlightTags } from './utils';

interface CellActionsPopoverProps {
  onFilter?: DocViewFilterFn;
  /** ECS mapping for the key */
  property?: DataViewField;
  name: string;
  /** Formatted value from the mapping, which will be displayed */
  value: string;
  /** The raw value from the mapping, can be an object */
  rawValue: unknown;
  /** Optional callback to render the formatted value */
  renderValue?: (value: string) => React.ReactNode;
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
  value,
  rawValue,
  renderValue,
  renderPopoverTrigger,
}: CellActionsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);

  const makeFilterHandlerByOperator = (operator: '+' | '-') => () => {
    if (onFilter) {
      onFilter(property ?? name, rawValue, operator);
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
        <EuiFlexItem style={{ maxWidth: '200px' }}>
          <EuiText
            size="s"
            className="eui-textBreakWord"
            css={css`
              font-family: ${euiTheme.font.familyCode};
            `}
          >
            <strong>{name}</strong>{' '}
            {typeof renderValue === 'function'
              ? renderValue(value)
              : rawValue != null && typeof rawValue !== 'object'
              ? (rawValue as React.ReactNode)
              : value}
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
              iconType="plusInCircle"
              aria-label={actionFilterForText(value)}
              onClick={makeFilterHandlerByOperator('+')}
              data-test-subj={`dataTableCellAction_addToFilterAction_${name}`}
            >
              {filterForText}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              key="removeFromFilterAction"
              size="s"
              iconType="minusInCircle"
              aria-label={actionFilterOutText(value)}
              onClick={makeFilterHandlerByOperator('-')}
              data-test-subj={`dataTableCellAction_removeFromFilterAction_${name}`}
            >
              {filterOutText}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      ) : null}
      <EuiPopoverFooter>
        <EuiCopy textToCopy={value}>
          {(copy) => (
            <EuiButtonEmpty
              key="copyToClipboardAction"
              size="s"
              iconType="copyClipboard"
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
    'onFilter' | 'name' | 'property' | 'value' | 'rawValue' | 'renderValue'
  > {
  icon?: EuiBadgeProps['iconType'];
  color?: string;
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
  renderValue,
  value,
  rawValue,
  color = 'hollow',
}: FieldBadgeWithActionsPropsAndDependencies) {
  const MAX_LENGTH = 20;

  return (
    <CellActionsPopover
      onFilter={onFilter}
      name={name}
      property={property}
      value={value}
      rawValue={rawValue}
      renderValue={renderValue}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <EuiBadge {...popoverTriggerProps} color={color} iconType={icon} iconSide="left">
          <span
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: truncateAndPreserveHighlightTags(value, MAX_LENGTH),
            }}
          />
        </EuiBadge>
      )}
    />
  );
}
