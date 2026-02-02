/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/serialize';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';

export interface ChartSectionTemplateProps {
  id: string;
  toolbarCss?: SerializedStyles;
  toolbar?: {
    toggleActions?: React.ReactElement;
    leftSide?: React.ReactNode;
    rightSide?: IconButtonGroupProps['buttons'];
    additionalControls?: {
      prependRight?: React.ReactNode;
    };
  };
  toolbarWrapAt?: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
}

export const ChartSectionTemplate = ({
  id,
  toolbarCss,
  toolbar,
  children,
  toolbarWrapAt,
}: React.PropsWithChildren<ChartSectionTemplateProps>) => {
  const { toggleActions, leftSide, rightSide = [] } = toolbar ?? {};
  const { euiTheme } = useEuiTheme();

  const toolbarContainerCss = useMemo(
    () =>
      toolbarWrapAt
        ? css`
            ${toolbarCss};
            @media (max-width: ${euiTheme.breakpoint[toolbarWrapAt]}px) {
              min-height: auto;
            }
          `
        : toolbarCss,
    [toolbarWrapAt, euiTheme, toolbarCss]
  );

  const toolbarWrapperCss = useMemo(
    () =>
      toolbarWrapAt
        ? css`
            @media (max-width: ${euiTheme.breakpoint[toolbarWrapAt]}px) {
              flex-wrap: wrap;
              [data-toolbar-section='toggle'] {
                order: 1;
              }
              [data-toolbar-section='left'] {
                flex-basis: 100%;
                order: 3;

                .unifiedHistogram__leftSideToolbar {
                  flex-wrap: wrap;

                  .unifiedHistogram__leftSideToolbarItem {
                    flex-grow: 1;
                    flex-basis: 100%;
                  }
                }
              }
              [data-toolbar-section='right'] {
                order: 2;
                margin-left: auto;
              }
            }
          `
        : undefined,
    [toolbarWrapAt, euiTheme]
  );

  return (
    <EuiFlexGroup
      id={id}
      className="unifiedHistogram__chart"
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
      onClick={handleClick}
      data-test-subj="unifiedHistogramChartContainer"
    >
      <EuiFlexItem grow={false} css={toolbarContainerCss}>
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          alignItems="center"
          css={toolbarWrapperCss}
        >
          {toggleActions && (
            <EuiFlexItem grow={false} data-toolbar-section="toggle">
              {toggleActions}
            </EuiFlexItem>
          )}

          {leftSide && (
            <EuiFlexItem grow data-toolbar-section="left">
              <EuiFlexGroup
                direction="row"
                gutterSize="s"
                responsive={false}
                className="unifiedHistogram__leftSideToolbar"
              >
                {React.Children.toArray(leftSide).map((child, i) => (
                  <EuiFlexItem
                    grow={false}
                    key={i}
                    className="unifiedHistogram__leftSideToolbarItem"
                  >
                    {child}
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}

          {(rightSide.length > 0 || toolbar?.additionalControls?.prependRight) && (
            <EuiFlexItem grow={false} data-toolbar-section="right">
              <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
                {toolbar?.additionalControls?.prependRight && (
                  <EuiFlexItem grow={false}>{toolbar.additionalControls.prependRight}</EuiFlexItem>
                )}
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
          )}
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
