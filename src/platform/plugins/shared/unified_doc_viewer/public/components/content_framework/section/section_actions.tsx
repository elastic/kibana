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
  | (BaseAction & { onClick: () => void; href?: never })
  | (BaseAction & { href: string; onClick?: never });

export interface SectionActionsProps {
  actions: Action[];
}

export const SectionActions = ({ actions }: SectionActionsProps) => {
  if (!actions.length) return null;
  const size = 'xs';

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
      {actions.map((action, idx) => {
        const { icon, ariaLabel, dataTestSubj, label, onClick, href } = action;
        const buttonProps = onClick ? { onClick } : { href };

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
