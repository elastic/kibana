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
  EuiToolTip,
} from '@elastic/eui';
import { InfoBlocks } from './info_blocks.component';
import { EMPTY_INFO_BLOCK } from './types';
import type { InfoBlockItem, InfoBlocksItem } from './types';

const meta: Meta<typeof InfoBlocks> = {
  title: 'Info Blocks/InfoBlocks',
  component: InfoBlocks,
};
export default meta;

const SAMPLE_ITEMS: InfoBlockItem[] = [
  { title: 'Owner', value: 'Platform' },
  { title: 'Latency', value: <EuiHealth color="success">Healthy</EuiHealth> },
  {
    // Long value that must truncate within its column, with a trailing copy action.
    title: 'Resource',
    value: (
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
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  { title: 'Throughput', value: '1.2k tpm' },
  { title: 'Environment', value: 'production' },
  { title: 'Error rate', value: <EuiHealth color="warning">0.4%</EuiHealth> },
  { title: 'Version', value: 'v8.19.0' },
];

interface DefaultArgs {
  numberOfItems: number;
  compressed: boolean;
}

export const Default: StoryObj<DefaultArgs> = {
  argTypes: {
    numberOfItems: {
      description: 'Number of info blocks to render',
      control: { type: 'range', min: 2, max: 7, step: 1 },
    },
  },
  args: {
    numberOfItems: 3,
    compressed: false,
  },
  render: ({ numberOfItems, compressed }) => (
    <InfoBlocks
      items={[...SAMPLE_ITEMS, ...ACTIONABLE_ITEMS]
        .sort(() => Math.random() - 0.5)
        .slice(0, numberOfItems)}
      compressed={compressed}
    />
  ),
};

type Story = StoryObj<typeof InfoBlocks>;

export const Compressed: Story = {
  args: {
    items: SAMPLE_ITEMS.slice(0, 3),
    compressed: true,
  },
};

// A mix of "big number" values and regular values. "Severity" shares a row with
// the big-number "Healthy" block to show both cells take the same row height.
const BIG_NUMBER_ITEMS: InfoBlockItem[] = [
  { title: 'Risk score', value: '90', valueSize: 'xl' },
  { title: 'Vendor', value: 'Elastic' },
  { title: 'Result', value: <EuiHealth color="success">Success</EuiHealth> },
  { title: 'Executed by', value: 'paul.ewing@elastic.co' },
  { title: 'Severity', value: <EuiHealth color="danger">High</EuiHealth> },
  { title: 'Healthy', value: '5', valueSize: 'xl' },
];

export const BigNumber: Story = {
  args: {
    items: BIG_NUMBER_ITEMS,
    compressed: false,
  },
};

// A leading "big number" block followed by an empty spacer, so the rest of row
// 1 stays blank and real content resumes on row 2. The empty block adapts to
// the live column count: at 2 columns it fills 1 remaining cell, at 3 columns
// it fills 2. Drive the width (or the 3 -> 2 -> 1 collapse) to see it adapt.
const EMPTY_BLOCK_ITEMS: InfoBlocksItem[] = [
  { title: 'Risk score', value: '90', valueSize: 'xl' },
  EMPTY_INFO_BLOCK,
  { title: 'Vendor', value: 'Elastic' },
  { title: 'Result', value: <EuiHealth color="success">Success</EuiHealth> },
  { title: 'Executed by', value: 'paul.ewing@elastic.co' },
  { title: 'Severity', value: <EuiHealth color="danger">High</EuiHealth> },
];

export const EmptyBlocks: StoryObj<DefaultArgs> = {
  argTypes: {
    numberOfItems: {
      description: 'Number of info blocks to render (includes the empty spacer)',
      control: { type: 'range', min: 2, max: EMPTY_BLOCK_ITEMS.length, step: 1 },
    },
  },
  args: {
    numberOfItems: EMPTY_BLOCK_ITEMS.length,
    compressed: false,
  },
  render: ({ numberOfItems, compressed }) => (
    <InfoBlocks items={EMPTY_BLOCK_ITEMS.slice(0, numberOfItems)} compressed={compressed} />
  ),
};

// One block's value is an inline SVG that is 280px tall. The tall block sets its
// row height; row-mates stretch and keep their content top-aligned.
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

const SVG_ITEMS: InfoBlockItem[] = [
  { title: 'Trend', value: TALL_SVG },
  { title: 'Owner', value: 'Platform' },
  { title: 'Environment', value: 'production' },
  { title: 'Throughput', value: '1.2k tpm' },
];

export const InlineSvg: Story = {
  args: {
    items: SVG_ITEMS,
    compressed: false,
  },
};

// No-op handler for the interactive controls below.
const noop = () => {};

// A truncating link with a trailing copy action, matching the SAMPLE_ITEMS
// "Resource" pattern.
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
          onClick={noop}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// Each value is arbitrary interactive/actionable content: icon buttons, a
// text+icon button, an avatar, a badge, brand/logo images, a health indicator,
// and a truncating link with a copy action. No component change is required.
const ACTIONABLE_ITEMS: InfoBlockItem[] = [
  {
    title: 'Assigned',
    value: (
      <EuiToolTip content="Assign" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plusInCircle"
          display="base"
          size="xs"
          aria-label="Assign"
          onClick={noop}
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
              onClick={noop}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    title: 'Notes',
    value: (
      <EuiButtonEmpty iconType="plusInCircle" size="s" flush="left" onClick={noop}>
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
