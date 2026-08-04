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
  EuiSwitch,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import type { InfoBlockItem } from '@kbn/shared-ux-flyout-common';
import { InfoBlocks } from './info_blocks.component';

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

// No-op handler for the interactive controls below.
const noop = () => {};

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
          onClick={noop}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// Examples of custom value content.
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

interface DefaultArgs {
  numberOfItems: number;
}

type Story = StoryObj<typeof InfoBlocks>;

const GalleryDemo: React.FC = () => {
  const [useCompressed, setUseCompressed] = React.useState(false);

  return (
    <div>
      <EuiSwitch
        id="compressed-toggle"
        label="Use compressed layout"
        checked={useCompressed}
        onChange={() => setUseCompressed(!useCompressed)}
      />

      <EuiSpacer size="xl" />
      <EuiTitle size="l">
        <h2>Sample set</h2>
      </EuiTitle>
      <InfoBlocks items={[...SAMPLE_ITEMS, ...ACTIONABLE_ITEMS]} compressed={useCompressed} />

      <EuiSpacer size="xl" />
      <EuiTitle size="l">
        <h2>Big number</h2>
      </EuiTitle>
      <InfoBlocks items={BIG_NUMBER_ITEMS} compressed={useCompressed} />

      <EuiSpacer size="xl" />
      <EuiTitle size="l">
        <h2>Leading spacer</h2>
      </EuiTitle>
      <InfoBlocks items={LEADING_SPACER_ITEMS} hasLeadingSpacer compressed={useCompressed} />
    </div>
  );
};

export const Gallery: Story = {
  args: {
    items: SAMPLE_ITEMS,
  },
  render: () => <GalleryDemo />,
};

// A mix of large and regular values.
const BIG_NUMBER_ITEMS: InfoBlockItem[] = [
  { title: 'Risk score', value: '90', size: 'xl' },
  ...SAMPLE_ITEMS.slice(0, 3),
  { title: 'Healthy', value: '5', size: 'xl', color: 'success' },
];

// The first block starts its own row; the rest resume on the next row.
const LEADING_SPACER_ITEMS: InfoBlockItem[] = [
  { title: 'Risk score', value: '90', size: 'xl' },
  ...SAMPLE_ITEMS.slice(0, 4),
];

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

const SVG_ITEMS: InfoBlockItem[] = [
  { title: 'Trend', value: TALL_SVG },
  ...SAMPLE_ITEMS.slice(0, 3),
];

export const InFlyout: Story = {
  render: () => (
    <EuiFlyout onClose={noop} size="m" aria-labelledby="flyoutTitle" minWidth={324} resizable>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">Info blocks in a flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <InfoBlocks items={[...SAMPLE_ITEMS, ...ACTIONABLE_ITEMS]} />
      </EuiFlyoutBody>
    </EuiFlyout>
  ),
};

export const LeadingSpacer: StoryObj<DefaultArgs> = {
  argTypes: {
    numberOfItems: {
      description: 'Number of info blocks to render',
      control: { type: 'range', min: 1, max: LEADING_SPACER_ITEMS.length, step: 1 },
    },
  },
  args: {
    numberOfItems: LEADING_SPACER_ITEMS.length,
  },
  render: ({ numberOfItems }) => (
    <InfoBlocks items={LEADING_SPACER_ITEMS.slice(0, numberOfItems)} hasLeadingSpacer />
  ),
};

export const InlineSvg: Story = {
  args: {
    items: SVG_ITEMS,
  },
};
