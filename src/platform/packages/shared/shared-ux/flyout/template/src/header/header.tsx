/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement, useMemo } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiMemoizedStyles,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiFlyoutProps, UseEuiTheme } from '@elastic/eui';
import type { ParsedItem } from '@kbn/ui-react-assembly';
import type { FlyoutHeaderProps } from '../types';
import { flyoutAssembly, headerAssembly } from '../assembly';
import { resolveZoneTestSubj, useFlyoutTemplateConfig } from '../context';
import { renderTitleIcon, renderTitleWithIcon } from '../title_adornments';

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

/** Best-effort label for a dropped child, for warning messages. */
const describeChild = (node: ReactNode): string => {
  if (!isValidElement(node)) {
    return JSON.stringify(node);
  }
  const { type } = node;
  if (typeof type === 'string') {
    return `<${type}>`;
  }
  const { displayName, name } = type as { displayName?: string; name?: string };
  return `<${displayName ?? name ?? 'Unknown'}>`;
};

/**
 * Dev-mode helper: reports header children that are not header parts.
 *
 * The header renders only its declared parts, so anything else is dropped.
 * Without this, the content silently vanishes.
 */
const warnOnUnstructuredChildren = (items: ParsedItem[]): void => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  for (const item of items) {
    if (item.type !== 'child') {
      continue;
    }

    // eslint-disable-next-line no-console
    console.warn(
      `[FlyoutTemplate] ${describeChild(item.node)} is not a Header part and is not ` +
        'rendered; put free-form content in the Body.'
    );
  }
};

type HeaderZoneProps = FlyoutHeaderProps & {
  flyoutTitleId?: string;
};

/** Internal renderer for the header zone. */
export const HeaderZone = ({
  title,
  titleIcon,
  titleTooltip,
  description,
  children,
  flyoutTitleId,
  'data-test-subj': dataTestSubj,
}: HeaderZoneProps) => {
  const { euiTheme } = useEuiTheme();
  const { dataTestSubj: rootTestSubj, paddingSize } = useFlyoutTemplateConfig();
  const horizontalPadding = resolveHorizontalPadding(euiTheme, paddingSize);

  // `supportsOtherChildren` suppresses the parser's generic passthrough warning so
  // `warnOnUnstructuredChildren` below is the only message; the header still drops these children.
  const items = useMemo(
    () => headerAssembly.parseChildren(children, { supportsOtherChildren: true }),
    [children]
  );

  warnOnUnstructuredChildren(items);

  const hasDescription = Boolean(description);

  return (
    <EuiFlyoutHeader
      hasBorder={false}
      data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Header')}
    >
      {renderTitleWithIcon(
        <EuiTitle size="m">
          <h3 id={flyoutTitleId}>{title}</h3>
        </EuiTitle>,
        renderTitleIcon(titleIcon, titleTooltip)
      )}
      {hasDescription && (
        <>
          <EuiSpacer size="xs" />
          {/* No `<p>` wrapper: `description` accepts block content, which cannot nest in a paragraph. */}
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <FullBleedDivider horizontalPadding={horizontalPadding} />
    </EuiFlyoutHeader>
  );
};
