/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from '@elastic/eui';
import { css, SerializedStyles } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { euiThemeVars } from '@kbn/ui-theme';
import { closeCellActionPopoverText, openCellActionPopoverAriaText } from './translations';
import { FilterInButton } from './filter_in_button';
import { FilterOutButton } from './filter_out_button';
import { CopyButton } from './copy_button';

const codeFontCSS = css`
  font-family: ${euiThemeVars.euiCodeFontFamily};
`;

interface ChipWithPopoverProps {
  /**
   * ECS mapping for the key
   */
  property: string;
  /**
   * Value for the mapping, which will be displayed
   */
  text: string;
  dataTestSubj?: string;
  leftSideIcon?: React.ReactNode;
  rightSideIcon?: EuiBadgeProps['iconType'];
}

export function ChipWithPopover({
  property,
  text,
  dataTestSubj = `dataTablePopoverChip_${property}`,
  leftSideIcon,
  rightSideIcon,
}: ChipWithPopoverProps) {
  return (
    <ChipPopover
      property={property}
      text={text}
      renderChip={({ handleChipClick, handleChipClickAriaLabel, chipCss }) => (
        <EuiBadge
          color="hollow"
          iconType={rightSideIcon}
          iconSide="right"
          data-test-subj={dataTestSubj}
          onClick={handleChipClick}
          onClickAriaLabel={handleChipClickAriaLabel}
          css={chipCss}
        >
          <EuiFlexGroup gutterSize="xs">
            {leftSideIcon && <EuiFlexItem>{leftSideIcon}</EuiFlexItem>}
            <EuiFlexItem>{text}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiBadge>
      )}
    />
  );
}

interface ChipPopoverProps {
  /**
   * ECS mapping for the key
   */
  property: string;
  /**
   * Value for the mapping, which will be displayed
   */
  text: string;
  renderChip: (props: {
    handleChipClick: () => void;
    handleChipClickAriaLabel: string;
    chipCss: SerializedStyles;
  }) => ReactElement;
}

export function ChipPopover({ property, text, renderChip }: ChipPopoverProps) {
  const [isPopoverOpen, { toggle: handleChipClick, off: closePopover }] = useBoolean(false);

  return (
    <EuiPopover
      button={renderChip({
        handleChipClick,
        handleChipClickAriaLabel: openCellActionPopoverAriaText,
        chipCss: css`
          margin-top: -3px;
        `,
      })}
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
