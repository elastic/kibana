/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import { InfoBlocks } from './info_blocks.component';
import type { InfoBlockItem, InfoBlocksMaxColumns } from './types';

const meta: Meta<typeof InfoBlocks> = {
  title: 'Flyout Template/Info Blocks',
  component: InfoBlocks,
  argTypes: {
    items: { table: { disable: true } },
    'data-test-subj': { table: { disable: true } },
  },
};
export default meta;

interface DefaultArgs {
  numberOfItems: number;
  maxColumns: InfoBlocksMaxColumns | 'auto';
}

// A truncating link with a trailing copy action.
const RESOURCE_LINK = (
  <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
    <EuiFlexItem
      grow={true}
      css={css`
        min-width: 0;
      `}
    >
      <EuiLink
        href="#"
        className="eui-textTruncate"
        css={css`
          display: block;
        `}
      >
        etcd-cspm-control-plane-8fO2b-1a2b3c4d5e6f7g8h9i0j-kube-system
      </EuiLink>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Copy resource identifier" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="copyClipboard"
          color="text"
          size="xs"
          aria-label="Copy resource identifier"
          onClick={action('Copy resource identifier clicked')}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const SAMPLE_ITEMS: InfoBlockItem[] = [
  { title: 'Owner', value: 'Platform' },
  { title: 'Latency', value: <EuiHealth color="success">Healthy</EuiHealth> },
  // Long value that must truncate within its column.
  { title: 'Resource', value: RESOURCE_LINK },
  { title: 'Throughput', value: '1.2k tpm' },
  { title: 'Environment', value: 'production' },
  { title: 'Error rate', value: <EuiHealth color="warning">0.4%</EuiHealth> },
  { title: 'Version', value: 'v8.19.0' },
  {
    title: 'Assigned',
    value: (
      <EuiToolTip content="Assign" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plusInCircle"
          display="base"
          size="xs"
          aria-label="Assign"
          onClick={action('Assign clicked')}
        />
      </EuiToolTip>
    ),
  },
  {
    title: 'Assigned',
    value: (
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiAvatar size="s" name="Alex Braun" initials="AB" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Assign another" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="plusInCircle"
              display="base"
              size="xs"
              aria-label="Assign another"
              onClick={action('Assign another clicked')}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    title: 'Notes',
    value: (
      <EuiButtonEmpty
        iconType="plusInCircle"
        size="s"
        flush="left"
        onClick={action('Add note clicked')}
      >
        Add note
      </EuiButtonEmpty>
    ),
  },
  {
    title: 'CVSS',
    value: <EuiBadge color="danger">10 (v3)</EuiBadge>,
  },
  {
    title: 'Framework',
    value: <EuiIcon type="logoAWS" size="l" title="AWS" />,
  },
  {
    title: 'Source',
    value: (
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoElastic" size="m" title="Elastic" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>Elastic</EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    title: 'Result',
    value: <EuiHealth color="success">Success</EuiHealth>,
  },
  {
    title: 'Resource',
    value: RESOURCE_LINK,
  },
];

const FlyoutWrapper: React.FC<{ children: React.ReactNode; title: string }> = ({
  children,
  title,
}) => (
  <EuiFlyout
    onClose={action('Flyout closed')}
    size="m"
    aria-labelledby="flyoutTitle"
    minWidth={324}
    resizable
    ownFocus={false}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="flyoutTitle">{title}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>

    <EuiFlyoutBody>{children}</EuiFlyoutBody>
  </EuiFlyout>
);

// Tall content sets the row height.
const TALL_SVG = (
  <svg
    width="100%"
    height={280}
    viewBox="0 0 200 280"
    role="img"
    aria-label="Placeholder chart"
    css={css`
      display: block;
    `}
  >
    <rect x="0" y="0" width="200" height="280" fill="#e6ebf2" rx="4" />
    <rect x="20" y="180" width="30" height="80" fill="#54b399" />
    <rect x="70" y="120" width="30" height="140" fill="#54b399" />
    <rect x="120" y="60" width="30" height="200" fill="#54b399" />
    <rect x="170" y="150" width="20" height="110" fill="#54b399" />
  </svg>
);

export const Default: StoryObj<DefaultArgs> = {
  name: 'InfoBlocks',
  argTypes: {
    numberOfItems: {
      description: 'Number of items in each panel',
      control: { type: 'range', min: 1, max: SAMPLE_ITEMS.length, step: 1 },
    },
    maxColumns: {
      description:
        'Widest column count, or `auto` to derive it from the item count; resize the flyout to see it step down',
      control: { type: 'inline-radio' },
      options: [2, 3, 4, 'auto'],
    },
  },
  args: {
    numberOfItems: SAMPLE_ITEMS.length,
    maxColumns: 'auto',
  },
  render: ({ numberOfItems, maxColumns }) => (
    <FlyoutWrapper title="Info blocks gallery">
      <EuiTitle size="s">
        <h3>Sample set</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <InfoBlocks items={SAMPLE_ITEMS.slice(0, numberOfItems)} maxColumns={maxColumns} />

      <EuiSpacer size="xl" />
      <EuiTitle size="s">
        <h3>Big number</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <InfoBlocks
        items={[
          {
            title: 'Risk score',
            value: '90',
            size: 'xl' as const,
            color: 'danger',
          },
          ...SAMPLE_ITEMS,
        ].slice(0, numberOfItems)}
        maxColumns={maxColumns}
      />

      <EuiSpacer size="xl" />
      <EuiTitle size="s">
        <h3>Inline SVG</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <InfoBlocks
        items={[{ title: 'Trend', value: TALL_SVG }, ...SAMPLE_ITEMS].slice(0, numberOfItems)}
        maxColumns={maxColumns}
      />
    </FlyoutWrapper>
  ),
};
