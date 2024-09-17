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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { euiThemeVars } from '@kbn/ui-theme';
import { closeCellActionPopoverText, openCellActionPopoverAriaText } from './translations';
import { FilterInButton } from './filter_in_button';
import { FilterOutButton } from './filter_out_button';
import { CopyButton } from './copy_button';

const codeFontCSS = css`
  font-family: ${euiThemeVars.euiCodeFontFamily};
`;

interface CellActionsPopoverProps {
  /* ECS mapping for the key */
  property: string;
  /* Value for the mapping, which will be displayed */
  text: string;
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
  property,
  text,
  renderPopoverTrigger,
}: CellActionsPopoverProps) {
  const [isPopoverOpen, { toggle: togglePopover, off: closePopover }] = useBoolean(false);

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
            <strong>{property}</strong> {text}
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
      <EuiPopoverFooter>
        <EuiFlexGroup responsive={false} gutterSize="s" wrap={true}>
          <FilterInButton value={text} property={property} />
          <FilterOutButton value={text} property={property} />
        </EuiFlexGroup>
      </EuiPopoverFooter>
      <EuiPopoverFooter>
        <CopyButton value={text} property={property} />
      </EuiPopoverFooter>
    </EuiPopover>
  );
}

interface FieldBadgeWithActionsProps {
  /* ECS mapping for the key */
  property: string;
  /* Value for the mapping, which will be displayed */
  text: string;
  icon?: EuiBadgeProps['iconType'];
}

export function FieldBadgeWithActions({ property, text, icon }: FieldBadgeWithActionsProps) {
  return (
    <CellActionsPopover
      property={property}
      text={text}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <EuiBadge {...popoverTriggerProps} color="hollow" iconType={icon} iconSide="left">
          <EuiTextTruncate text={text} truncation="middle" width={120} />
        </EuiBadge>
      )}
    />
  );
}
