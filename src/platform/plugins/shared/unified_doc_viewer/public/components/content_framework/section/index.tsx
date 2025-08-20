/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface Action {
  icon: IconType;
  onClick: () => void;
  ariaLabel: string;
  dataTestSubj: string;
  label?: string;
}

export interface ContentFrameworkSectionProps {
  id: string;
  title: string;
  description?: string;
  actions?: Action[];
  children: React.ReactNode;
}

export const ContentFrameworkSection: React.FC<ContentFrameworkSectionProps> = ({
  id,
  title,
  description,
  actions,
  children,
}) => {
  const renderActions = () => (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
      {actions?.map((action, idx) => {
        const { icon, onClick, ariaLabel, label, dataTestSubj } = action;
        const size = 'xs';
        return (
          <EuiFlexItem grow={false} key={idx}>
            {label ? (
              <EuiButtonEmpty
                size={size}
                iconType={icon}
                aria-label={ariaLabel}
                onClick={onClick}
                data-test-subj={dataTestSubj}
              >
                {label}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonIcon
                size={size}
                iconType={icon}
                onClick={onClick}
                aria-label={ariaLabel}
                data-test-subj={dataTestSubj}
              />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      id={`sectionAccordion-${id}`}
      initialIsOpen
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {description && (
            <EuiFlexItem grow={false}>
              <EuiIconTip content={description} size="s" color="subdued" aria-label={description} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={
        actions?.length && (
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>{renderActions()}</EuiFlexItem>{' '}
          </EuiFlexGroup>
        )
      }
    >
      <>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={false}>
          {children}
        </EuiPanel>
      </>
    </EuiAccordion>
  );
};
