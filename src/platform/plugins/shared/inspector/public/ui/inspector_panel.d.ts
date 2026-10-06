/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { Component } from 'react';
import type { InspectorViewDescription } from '../types';
import type { Adapters } from '../../common';
import type { InspectorKibanaServices } from '../views/requests/components/types';
interface InspectorPanelProps {
  adapters: Adapters;
  title?: string;
  options?: unknown;
  views: InspectorViewDescription[];
  dependencies: InspectorKibanaServices;
}
interface InspectorPanelState {
  selectedView: InspectorViewDescription;
  views: InspectorViewDescription[];
  adapters: Adapters;
}
export declare class InspectorPanel extends Component<InspectorPanelProps, InspectorPanelState> {
  static defaultProps: {
    title: string;
  };
  state: InspectorPanelState;
  static getDerivedStateFromProps(
    nextProps: InspectorPanelProps,
    prevState: InspectorPanelState
  ): {
    views: InspectorViewDescription[];
    selectedView: InspectorViewDescription;
  };
  onViewSelected: (view: InspectorViewDescription) => void;
  renderSelectedPanel(): React.JSX.Element;
  render(): React.JSX.Element;
}
export {};
