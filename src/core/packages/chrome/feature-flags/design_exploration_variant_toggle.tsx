/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  DESIGN_EXPLORATION_VARIANT_OPTIONS,
  getDesignExplorationVariant,
  setDesignExplorationVariant,
} from '.';

const badgeStyles = css`
  cursor: pointer;
`;

export const DesignExplorationVariantToggle = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const activeVariantId = getDesignExplorationVariant();

  const activeVariantLabel = useMemo(() => {
    return (
      DESIGN_EXPLORATION_VARIANT_OPTIONS.find(({ id }) => id === activeVariantId)?.label ??
      activeVariantId
    );
  }, [activeVariantId]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const onSelectVariant = useCallback(
    (variantId: string) => {
      closePopover();

      if (variantId !== activeVariantId) {
        setDesignExplorationVariant(variantId);
      }
    },
    [activeVariantId, closePopover]
  );

  return (
    <EuiPopover
      button={
        <EuiToolTip content="Switch design direction. Page will reload.">
          <EuiBadge
            color="#0B1628"
            css={badgeStyles}
            iconType="palette"
            iconSide="left"
            onClick={togglePopover}
            onClickAriaLabel="Switch design exploration variant"
          >
            {activeVariantLabel}
          </EuiBadge>
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel
        items={DESIGN_EXPLORATION_VARIANT_OPTIONS.map(({ id, label }) => (
          <EuiContextMenuItem
            key={id}
            icon={id === activeVariantId ? 'check' : 'empty'}
            onClick={() => onSelectVariant(id)}
          >
            {label}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
