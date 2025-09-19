/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface BaseAction {
  icon: IconType;
  ariaLabel: string;
  dataTestSubj?: string;
  label?: string;
}

type Action =
  | (BaseAction & { onClick: () => void; href?: never })
  | (BaseAction & { href: string; onClick?: never });

export interface ContentFrameworkSectionProps {
  id: string;
  title: string;
  description?: string;
  actions?: Action[];
  children: React.ReactNode;
  'data-test-subj'?: string;
  initialIsOpen?: boolean;
}

export function ContentFrameworkSection({
  id,
  title,
  description,
  actions,
  children,
  'data-test-subj': accordionDataTestSubj,
  initialIsOpen = true,
}: ContentFrameworkSectionProps) {
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(initialIsOpen);
  const renderActions = () => (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
      {actions?.map((action, idx) => {
        const { icon, onClick, ariaLabel, label, dataTestSubj, href } = action;
        const size = 'xs';
        const buttonProps = onClick ? { onClick } : { href };
        return (
          <EuiFlexItem grow={false} key={idx}>
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

  return (
    <>
      <EuiAccordion
        data-test-subj={accordionDataTestSubj}
        id={`sectionAccordion-${id}`}
        initialIsOpen={isAccordionExpanded}
        onToggle={setIsAccordionExpanded}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {description && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={description}
                  size="s"
                  color="subdued"
                  aria-label={description}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        extraAction={
          actions?.length ? (
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>{renderActions()}</EuiFlexItem>
            </EuiFlexGroup>
          ) : null
        }
      >
        <>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
            {children}
          </EuiPanel>
        </>
      </EuiAccordion>
      {!isAccordionExpanded ? <EuiHorizontalRule margin="xs" /> : <EuiSpacer size="m" />}
    </>
  );
}
