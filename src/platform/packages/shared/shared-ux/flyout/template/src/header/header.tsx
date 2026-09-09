/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiMemoizedStyles,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { flyoutAssembly } from '../assembly';
import { resolveZoneTestSubj, useFlyoutHeaderCollapse, useFlyoutTemplateConfig } from '../context';
import { renderTitleIcon, renderTitleWithIcon } from '../title_adornments';
import type { FlyoutHeaderProps } from '../types';

/** Part name used for identifying the `Header` zone. */
export const HEADER_PART_NAME = 'header';

const headerPart = flyoutAssembly.definePart({ name: HEADER_PART_NAME });

/** Declarative `FlyoutTemplate.Header`; the root renders the collected attributes. */
const BaseHeader = headerPart.createComponent<FlyoutHeaderProps>();
BaseHeader.displayName = 'FlyoutTemplate.Header';

export const Header = BaseHeader;

/** Maps `paddingSize` to the header's horizontal padding; `undefined` follows EuiFlyout's `'l'` default. */
const resolveHorizontalPadding = (
  euiTheme: UseEuiTheme['euiTheme'],
  paddingSize: EuiFlyoutProps['paddingSize']
): string => {
  switch (paddingSize) {
    case 'none':
      return '0';
    case 's':
      return euiTheme.size.s;
    case 'm':
      return euiTheme.size.base;
    case 'l':
    default:
      return euiTheme.size.l;
  }
};

const dividerStyles = ({ euiTheme }: UseEuiTheme) => ({
  divider: css`
    border-block-end: ${euiTheme.border.thin};
  `,
});

const collapsibleRegionStyles = ({ euiTheme }: UseEuiTheme) => {
  const duration = euiTheme.animation.normal;
  const easing = euiTheme.animation.resistance;
  return {
    collapsedRow: css`
      /* Reserve space so the title does not run under EUI's absolutely-positioned close button. */
      padding-inline-end: ${euiTheme.size.xxl};
    `,
    collapsedTitle: css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    wrapper: css`
      display: grid;
      overflow: hidden;
    `,
    wrapperExpanded: css`
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
      @media (prefers-reduced-motion: no-preference) {
        transition: grid-template-rows ${duration} ${easing}, opacity ${duration} ${easing},
          visibility 0s;
      }
    `,
    wrapperCollapsed: css`
      grid-template-rows: 0fr;
      opacity: 0;
      visibility: hidden;
      @media (prefers-reduced-motion: no-preference) {
        transition: grid-template-rows ${duration} ${easing}, opacity ${duration} ${easing},
          visibility 0s ${duration};
      }
    `,
    inner: css`
      overflow: hidden;
      min-block-size: 0;
    `,
  };
};

/** Full-width divider: negative horizontal margins bleed it past the header padding to the flyout edges. */
const FullBleedDivider = ({ horizontalPadding }: { horizontalPadding: string }) => {
  const styles = useEuiMemoizedStyles(dividerStyles);
  return (
    <div
      aria-hidden
      css={styles.divider}
      style={{
        marginInlineStart: `-${horizontalPadding}`,
        marginInlineEnd: `-${horizontalPadding}`,
      }}
    />
  );
};

type HeaderZoneProps = FlyoutHeaderProps & {
  flyoutTitleId?: string;
};

/** Internal renderer for the header zone; dividers are template-owned for full bleed. */
export const HeaderZone = ({
  title,
  titleIcon,
  titleTooltip,
  description,
  collapsed = false,
  flyoutTitleId,
  'data-test-subj': dataTestSubj,
}: HeaderZoneProps) => {
  const { euiTheme } = useEuiTheme();
  const collapseStyles = useEuiMemoizedStyles(collapsibleRegionStyles);
  const { dataTestSubj: rootTestSubj, paddingSize } = useFlyoutTemplateConfig();
  const {
    isCollapsed: isScrollCollapsed,
    collapsibleRef,
    expandedTitleRef,
    expandedSpacerRef,
    headerRef,
  } = useFlyoutHeaderCollapse();
  const isCollapsed = collapsed || isScrollCollapsed;
  const horizontalPadding = resolveHorizontalPadding(euiTheme, paddingSize);

  const hasDescription = Boolean(description);

  return (
    <KibanaErrorBoundaryProvider>
      <EuiFlyoutHeader
        hasBorder={false}
        data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Header')}
      >
        <KibanaErrorBoundary>
          {/* Wraps the header content so the collapse hook can reach the header element for wheel forwarding. */}
          <div ref={headerRef}>
            {/* Always visible: title row. Switches between expanded and compact on collapse. */}
            <div ref={!isCollapsed ? expandedTitleRef : undefined}>
              {isCollapsed ? (
                <div css={collapseStyles.collapsedRow}>
                  <EuiTitle size="xs">
                    <h3
                      id={flyoutTitleId}
                      css={collapseStyles.collapsedTitle}
                      title={typeof title === 'string' ? title : undefined}
                    >
                      {title}
                    </h3>
                  </EuiTitle>
                </div>
              ) : (
                renderTitleWithIcon(
                  <EuiTitle size="m">
                    <h3 id={flyoutTitleId}>{title}</h3>
                  </EuiTitle>,
                  renderTitleIcon(titleIcon, titleTooltip)
                )
              )}
            </div>

            {/* Collapsible region: currently the description; later header parts land here too. */}
            <div
              css={[
                collapseStyles.wrapper,
                isCollapsed ? collapseStyles.wrapperCollapsed : collapseStyles.wrapperExpanded,
              ]}
              aria-hidden={isCollapsed || undefined}
              data-test-subj="flyoutHeaderCollapsibleRegion"
            >
              <div css={collapseStyles.inner} ref={!collapsed ? collapsibleRef : undefined}>
                {hasDescription && (
                  <>
                    <EuiSpacer size="xs" />
                    {/* No `<p>` wrapper: `description` accepts block content, which cannot nest in a paragraph. */}
                    <EuiText size="s" color="subdued">
                      {description}
                    </EuiText>
                  </>
                )}
              </div>
            </div>

            {/* Always visible: spacing before the divider, which tightens when collapsed. */}
            <div ref={!isCollapsed ? expandedSpacerRef : undefined}>
              <EuiSpacer size={isCollapsed ? 'xs' : 'm'} />
            </div>

            <FullBleedDivider horizontalPadding={horizontalPadding} />
          </div>
        </KibanaErrorBoundary>
      </EuiFlyoutHeader>
    </KibanaErrorBoundaryProvider>
  );
};
