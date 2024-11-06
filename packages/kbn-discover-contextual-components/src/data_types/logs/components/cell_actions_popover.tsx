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
  EuiTextTruncate,
  EuiButtonEmpty,
  EuiCopy,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { euiThemeVars } from '@kbn/ui-theme';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
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

const codeFontCSS = css`
  font-family: ${euiThemeVars.euiCodeFontFamily};
`;

interface CellActionsPopoverProps {
  onFilter?: DocViewFilterFn;
  /* ECS mapping for the key */
  property: string;
  /* Value for the mapping, which will be displayed */
  value: string;
  /* Optional callback to render the value */
  renderValue?: (value: string) => React.ReactNode;
  /* Props to forward to the trigger Badge */
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
  value,
  renderValue,
  renderPopoverTrigger,
}: CellActionsPopoverProps) {
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);

  const makeFilterHandlerByOperator = (operator: '+' | '-') => () => {
    if (onFilter) {
      onFilter(property, value, operator);
    }
  };

  const popoverTriggerProps = {
    onClick: togglePopover,
    onClickAriaLabel: openCellActionPopoverAriaText,
    'data-test-subj': `dataTableCellActionsPopover_${property}`,
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
          <EuiText size="s" css={codeFontCSS}>
            <strong>{property}</strong>{' '}
            {typeof renderValue === 'function' ? renderValue(value) : value}
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
              data-test-subj={`dataTableCellAction_addToFilterAction_${property}`}
            >
              {filterForText}
            </EuiButtonEmpty>
            <EuiButtonEmpty
              key="removeFromFilterAction"
              size="s"
              iconType="minusInCircle"
              aria-label={actionFilterOutText(value)}
              onClick={makeFilterHandlerByOperator('-')}
              data-test-subj={`dataTableCellAction_removeFromFilterAction_${property}`}
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
              aria-label={copyValueAriaText(property)}
              onClick={copy}
              data-test-subj={`dataTableCellAction_copyToClipboardAction_${property}`}
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
  extends Pick<CellActionsPopoverProps, 'onFilter' | 'property' | 'value' | 'renderValue'> {
  icon?: EuiBadgeProps['iconType'];
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
  property,
  renderValue,
  value,
}: FieldBadgeWithActionsPropsAndDependencies) {
  return (
    <CellActionsPopover
      onFilter={onFilter}
      property={property}
      value={value}
      renderValue={renderValue}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <EuiBadge {...popoverTriggerProps} color="hollow" iconType={icon} iconSide="left">
          <EuiTextTruncate text={value} truncation="middle" width={120} />
        </EuiBadge>
      )}
    />
  );
}
