/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { EuiAccordionProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { Action } from './section_actions';
import { SectionActions } from './section_actions';

export interface ContentFrameworkSectionProps {
  id: string;
  title: string;
  description?: string;
  actions?: Action[];
  children: React.ReactNode;
  'data-test-subj'?: string;
  onToggle?: (isOpen: boolean) => void;
  forceState?: EuiAccordionProps['forceState'];
  isTechPreview?: boolean;
  hasBorder?: boolean;
  hasPadding?: boolean;
}

export function ContentFrameworkSection({
  id,
  title,
  description,
  actions,
  children,
  onToggle,
  forceState = 'open',
  'data-test-subj': accordionDataTestSubj,
  isTechPreview = false,
  hasBorder = true,
  hasPadding = true,
}: ContentFrameworkSectionProps) {
  const [accordionState, setAccordionState] = useState<EuiAccordionProps['forceState']>(forceState);

  useEffect(() => {
    setAccordionState(forceState);
  }, [forceState]);

  const handleToggle = (isOpen: boolean) => {
    setAccordionState(isOpen ? 'open' : 'closed');
    onToggle?.(isOpen);
  };

  return (
    <>
      <EuiAccordion
        data-test-subj={accordionDataTestSubj}
        id={`sectionAccordion-${id}`}
        initialIsOpen={forceState === 'open'}
        onToggle={handleToggle}
        forceState={accordionState}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {description ? (
              <EuiFlexItem grow={false}>
                {isTechPreview ? (
                  <EuiBetaBadge
                    size="s"
                    label={description}
                    alignment="middle"
                    color="hollow"
                    iconType="beaker"
                    title={title}
                    data-test-subj="ContentFrameworkSectionEuiBetaBadge"
                  />
                ) : (
                  <EuiIconTip
                    content={description}
                    size="s"
                    color="subdued"
                    aria-label={description}
                  />
                )}
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
        extraAction={
          actions?.length && (
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <SectionActions actions={actions} />
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={hasBorder} hasShadow={false} paddingSize={hasPadding ? 's' : 'none'}>
          {children}
        </EuiPanel>
      </EuiAccordion>
      {accordionState === 'closed' ? <EuiHorizontalRule margin="xs" /> : <EuiSpacer size="m" />}
    </>
  );
}
