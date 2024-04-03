/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiTitle,
  EuiLink,
  EuiPanelProps,
} from '@elastic/eui';
import { LEARN_MORE_LABEL } from '../constants';

interface OverviewPanelProps {
  description?: React.ReactNode | string;
  leftPanelContent?: React.ReactNode;
  links?: Array<{ label: string; href: string }>;
  rightPanelContent?: React.ReactNode;
  title: string;
  overviewPanelProps?: Partial<EuiPanelProps>;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  children,
  description,
  leftPanelContent,
  links,
  rightPanelContent,
  title,
  overviewPanelProps,
}) => {
  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup alignItems="flexStart" gutterSize="xl">
        {leftPanelContent && <EuiFlexItem grow={6}>{leftPanelContent}</EuiFlexItem>}
        <EuiFlexItem grow={4}>
          <EuiPanel paddingSize="none" color="subdued" {...overviewPanelProps}>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            {description && <EuiText>{description}</EuiText>}
            {children}
            {links && links.length > 0 ? (
              <>
                <EuiSpacer />
                <EuiTitle size="xxs">
                  <h3>{LEARN_MORE_LABEL}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {links.map(({ label, href }, index) => (
                  <Fragment key={`overviewPanel.link.${index}`}>
                    <EuiText size="s">
                      <EuiLink key={index} href={href} target="_blank">
                        {label}
                      </EuiLink>
                    </EuiText>
                    <EuiSpacer size="xs" />
                  </Fragment>
                ))}
              </>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
        {rightPanelContent && <EuiFlexItem grow={6}> {rightPanelContent}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
    </>
  );
};
