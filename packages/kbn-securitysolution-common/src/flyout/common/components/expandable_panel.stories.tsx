/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiIcon } from '@elastic/eui';
import { ExpandablePanel } from './expandable_panel';

export default {
  component: ExpandablePanel,
  title: 'Flyout/ExpandablePanel',
};

const defaultProps = {
  header: {
    title: 'title',
    iconType: 'storage',
  },
};
const headerContent = <EuiIcon type="expand" />;

const children = <p>{'test content'}</p>;

export const Default: Story<void> = () => {
  return <ExpandablePanel {...defaultProps}>{children}</ExpandablePanel>;
};

export const DefaultWithoutIcon: Story<void> = () => {
  const props = { header: { title: 'title' } };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const DefaultWithHeaderContent: Story<void> = () => {
  const props = {
    ...defaultProps,
    header: { ...defaultProps.header, headerContent },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const Expandable: Story<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const ExpandableDefaultOpen: Story<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true, expandedOnFirstRender: true },
  };
  return <ExpandablePanel {...props}>{children}</ExpandablePanel>;
};

export const EmptyDefault: Story<void> = () => {
  return <ExpandablePanel {...defaultProps} />;
};

export const EmptyDefaultExpanded: Story<void> = () => {
  const props = {
    ...defaultProps,
    expand: { expandable: true },
  };
  return <ExpandablePanel {...props} />;
};
