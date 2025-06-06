/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import { FilterBadgeInvalidPlaceholder } from './filter_badge_invalid';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FilterBadgeErrorBoundaryProps {}

interface FilterBadgeErrorBoundaryState {
  hasError: boolean;
}

export class FilterBadgeErrorBoundary extends Component<
  React.PropsWithChildren<FilterBadgeErrorBoundaryProps>,
  FilterBadgeErrorBoundaryState
> {
  constructor(props: FilterBadgeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentWillReceiveProps() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <FilterBadgeInvalidPlaceholder />;
    }

    return this.props.children;
  }
}
