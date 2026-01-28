/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

interface BaseAction {
  icon: IconType;
  ariaLabel: string;
  dataTestSubj?: string;
  label?: string;
  id?: string;
}

export type Action =
  | (BaseAction & { onClick: () => void; href?: string })
  | (BaseAction & { href: string; onClick?: () => void });

export interface SectionActionsProps {
  actions: Action[];
}

function isPlainLeftClick(e: React.MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export const SectionActions = ({ actions }: SectionActionsProps) => {
  if (!actions.length) return null;
  const size = 'xs';

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
      {actions.map((action, idx) => {
        const { icon, ariaLabel, dataTestSubj, label, onClick, href } = action;
        const handleClick = onClick
          ? (e: React.MouseEvent) => {
              // If we have an href, keep native link behaviour for right clicks and modifier clicks.
              // Plain left click should run the provided handler instead.
              if (href && !isPlainLeftClick(e)) return;
              if (href) e.preventDefault();
              onClick();
            }
          : undefined;

        const buttonProps = {
          ...(href ? { href } : {}),
          ...(handleClick ? { onClick: handleClick } : {}),
        };

        return (
          <EuiFlexItem grow={false} key={action.id ?? idx} id={action.id}>
            {label ? (
              <EuiButtonEmpty
                size={size}
                iconType={icon}
                aria-label={ariaLabel}
                data-test-subj={dataTestSubj}
                {...buttonProps}
              >
                {label}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonIcon
                size={size}
                iconType={icon}
                aria-label={ariaLabel}
                data-test-subj={dataTestSubj}
                {...buttonProps}
              />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
