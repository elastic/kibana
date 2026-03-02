/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';

/**
 * CSS applied to tabs-only page headers so they keep horizontal padding
 * when paddingSize is 'none' (which removes both block and inline padding).
 * POC: hardcoded value; may move to EUI later.
 */
export const tabsOnlyHeaderCss = css`
  padding-inline: 8px;
`;

/**
 * Default props applied to EuiPageTemplate.Header when it's tabs-only
 * (tabs present, no pageTitle/description/rightSideItems/children).
 * Ensures border under tabs and no extra vertical spacer.
 */
export const TABS_ONLY_HEADER_DEFAULTS = {
  bottomBorder: 'extended' as const,
  paddingSize: 'none' as const,
};

interface HeaderLikeProps {
  tabs?: unknown;
  pageTitle?: React.ReactNode;
  description?: React.ReactNode;
  rightSideItems?: React.ReactNode | React.ReactNode[];
  children?: React.ReactNode;
}

/**
 * True when the header has only tabs (no title, description, right side items, or children).
 * Used to apply tabs-only styling so the header matches the Dashboards listing look.
 */
export const isTabsOnlyHeader = (props: HeaderLikeProps): boolean => {
  const hasTabs = Boolean(props.tabs);
  const hasTitle = props.pageTitle != null && props.pageTitle !== '';
  const hasDescription = props.description != null && props.description !== '';
  const hasRightSideItems =
    Array.isArray(props.rightSideItems)
      ? props.rightSideItems.length > 0
      : props.rightSideItems != null && props.rightSideItems !== '';
  const hasChildren =
    props.children != null && React.Children.count(props.children) > 0;
  return (
    hasTabs &&
    !hasTitle &&
    !hasDescription &&
    !hasRightSideItems &&
    !hasChildren
  );
};
