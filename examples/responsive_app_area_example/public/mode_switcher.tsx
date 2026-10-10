/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiBadge, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { MODE_OPTIONS, mode, setMode } from './mode';

export const ModeSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const current = MODE_OPTIONS.find(({ id }) => id === mode) ?? MODE_OPTIONS[0];

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="#0B1628"
          iconType="tableDensityNormal"
          iconSide="left"
          onClick={() => setIsOpen((open) => !open)}
          onClickAriaLabel="Switch breakpoints mode"
        >
          Breakpoints: {current.label}
        </EuiBadge>
      }
      panelPaddingSize="none"
      offset={4}
      anchorPosition="upRight"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      aria-label="Switch breakpoints mode"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: 'Breakpoints mode',
            items: MODE_OPTIONS.map(({ id, label }) => ({
              name: label,
              icon: id === mode ? 'check' : 'empty',
              onClick: () => setMode(id),
            })),
          },
        ]}
      />
    </EuiPopover>
  );
};
