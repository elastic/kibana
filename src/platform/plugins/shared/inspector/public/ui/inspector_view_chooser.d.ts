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
interface Props {
  views: InspectorViewDescription[];
  onViewSelected: (view: InspectorViewDescription) => void;
  selectedView: InspectorViewDescription;
}
interface State {
  isSelectorOpen: boolean;
}
export declare class InspectorViewChooser extends Component<Props, State> {
  state: State;
  toggleSelector: () => void;
  closeSelector: () => void;
  renderView: (view: InspectorViewDescription, index: number) => React.JSX.Element;
  renderViewButton(): React.JSX.Element;
  renderSingleView(): React.JSX.Element;
  render(): React.JSX.Element;
}
export {};
