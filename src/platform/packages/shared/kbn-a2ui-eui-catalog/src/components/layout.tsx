/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import type { EuiFlexGroupProps } from '@elastic/eui';
import type { CatalogComponent, ChildList } from '@kbn/a2ui-renderer';
import { bool, num, objectArray, oneOf, optionalStr, str } from '../coerce';

const GAPS = ['none', 'xs', 's', 'm', 'l', 'xl'] as const;

const ALIGN: Record<string, EuiFlexGroupProps['alignItems']> = {
  start: 'flexStart',
  center: 'center',
  end: 'flexEnd',
  stretch: 'stretch',
  baseline: 'baseline',
};

const JUSTIFY: Record<string, EuiFlexGroupProps['justifyContent']> = {
  start: 'flexStart',
  center: 'center',
  end: 'flexEnd',
  spaceBetween: 'spaceBetween',
  spaceAround: 'spaceAround',
  spaceEvenly: 'spaceEvenly',
};

function flexProps(props: Record<string, unknown>) {
  return {
    gutterSize: oneOf(props.gap, GAPS, 'm'),
    alignItems: ALIGN[str(props.align)],
    justifyContent: JUSTIFY[str(props.justify)],
  };
}

/**
 * EUI's flex sizing only applies to direct `EuiFlexItem` children, so a child
 * rendered straight into the group can never take the leftover space. When `grow`
 * is set each child is wrapped; when it is absent nothing is wrapped, which keeps
 * existing documents rendering byte-for-byte as they did.
 */
function growChildren(children: React.ReactNode, grow: unknown): React.ReactNode {
  if (grow === undefined || grow === null) return children;
  const factors = Array.isArray(grow) ? grow : undefined;
  return React.Children.toArray(children).map((child, index) => {
    const factor = num(factors ? factors[index] : grow, 0);
    return (
      <EuiFlexItem key={index} grow={factor > 0 ? (Math.min(factor, 10) as 1) : false}>
        {child}
      </EuiFlexItem>
    );
  });
}

export const Column: CatalogComponent = {
  name: 'Column',
  render: ({ props, buildChild, accessibility }) => (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      aria-label={accessibility?.label}
      {...flexProps(props)}
    >
      {growChildren(buildChild(props.children as ChildList), props.grow)}
    </EuiFlexGroup>
  ),
};

export const Row: CatalogComponent = {
  name: 'Row',
  render: ({ props, buildChild, accessibility }) => (
    <EuiFlexGroup
      direction="row"
      responsive={false}
      wrap={bool(props.wrap)}
      aria-label={accessibility?.label}
      {...flexProps(props)}
    >
      {growChildren(buildChild(props.children as ChildList), props.grow)}
    </EuiFlexGroup>
  ),
};

export const Card: CatalogComponent = {
  name: 'Card',
  render: ({ props, rawProps, buildChild, accessibility }) => {
    const title = optionalStr(props.title);
    // `rawProps` rather than `props`, so an absent header is distinguishable from
    // one whose binding resolved to nothing.
    const hasHeader = rawProps.header !== undefined && rawProps.header !== null;

    return (
      <EuiPanel
        paddingSize={oneOf(props.paddingSize, ['none', 's', 'm', 'l'] as const, 'm')}
        hasBorder={bool(props.hasBorder, true)}
        hasShadow={false}
        aria-label={accessibility?.label}
      >
        {hasHeader ? (
          <>
            {buildChild(props.header as string)}
            <EuiSpacer size="s" />
          </>
        ) : (
          title && (
            <>
              <EuiTitle size={oneOf(props.titleSize, ['xs', 's', 'm'] as const, 'xs')}>
                <h3>{title}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
            </>
          )
        )}
        {buildChild(props.child as string)}
      </EuiPanel>
    );
  },
};

export const Tabs: CatalogComponent = {
  name: 'Tabs',
  render: ({ props, buildChild, id }) => {
    const tabs = objectArray(props.tabs).map((tab, index) => ({
      id: `${id}-tab-${index}`,
      name: str(tab.title, `Tab ${index + 1}`),
      content: <>{buildChild(tab.child as string)}</>,
    }));

    if (tabs.length === 0) return null;
    return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />;
  },
};

export const Divider: CatalogComponent = {
  name: 'Divider',
  render: ({ props }) => (
    <EuiHorizontalRule margin={oneOf(props.margin, ['none', 's', 'm', 'l'] as const, 'm')} />
  ),
};
