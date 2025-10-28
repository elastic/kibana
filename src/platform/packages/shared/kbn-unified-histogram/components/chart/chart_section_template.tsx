/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/serialize';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';

export interface ChartSectionTemplateProps {
  id: string;
  toolbarCss?: SerializedStyles;
  toolbar?: {
    leftSide?: React.ReactNode;
    rightSide?: IconButtonGroupProps['buttons'];
    additionalControls?: {
      prependRight?: React.ReactNode;
    };
  };
  children: React.ReactNode;
}

export const ChartSectionTemplate = ({
  id,
  toolbarCss,
  toolbar,
  children,
}: ChartSectionTemplateProps) => {
  const { leftSide = [], rightSide = [] } = toolbar ?? {};

  return (
    <EuiFlexGroup
      id={id}
      className="unifiedHistogram__chart"
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
      onClick={handleClick}
    >
      <EuiFlexItem grow={false} css={toolbarCss}>
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false} alignItems="center">
              {React.Children.toArray(leftSide).map((child, i) => (
                <EuiFlexItem grow={false} key={i}>
                  {child}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
              {toolbar?.additionalControls?.prependRight ? (
                <EuiFlexItem grow={false}>{toolbar.additionalControls.prependRight}</EuiFlexItem>
              ) : null}
              {rightSide.length > 0 && (
                <EuiFlexItem grow={false}>
                  <IconButtonGroup
                    legend={i18n.translate('unifiedHistogram.chartActionsGroupLegend', {
                      defaultMessage: 'Chart actions',
                    })}
                    buttonSize="s"
                    buttons={rightSide}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {children}
    </EuiFlexGroup>
  );
};

const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
  const target = event.target as HTMLElement;

  if (target.closest('[data-test-subj="embeddablePanelAction-openInspector"]')) {
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.inspectorPanel);
  }
};
