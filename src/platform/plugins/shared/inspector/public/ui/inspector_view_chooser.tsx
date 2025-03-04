/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiContextMenuItem, EuiTabs, EuiTab } from '@elastic/eui';
import { InspectorViewDescription } from '../types';

interface Props {
  views: InspectorViewDescription[];
  onViewSelected: (view: InspectorViewDescription) => void;
  selectedView: InspectorViewDescription;
}

interface State {
  isSelectorOpen: boolean;
}

export class InspectorViewChooser extends Component<Props, State> {
  static propTypes = {
    views: PropTypes.array.isRequired,
    onViewSelected: PropTypes.func.isRequired,
    selectedView: PropTypes.object.isRequired,
  };

  state: State = {
    isSelectorOpen: false,
  };

  toggleSelector = () => {
    this.setState((prev) => ({
      isSelectorOpen: !prev.isSelectorOpen,
    }));
  };

  closeSelector = () => {
    this.setState({
      isSelectorOpen: false,
    });
  };

  renderView = (view: InspectorViewDescription, index: number) => {
    return (
      <EuiContextMenuItem
        key={index}
        onClick={() => {
          this.props.onViewSelected(view);
          this.closeSelector();
        }}
        toolTipContent={view.help}
        toolTipProps={{ position: 'left' }}
        data-test-subj={`inspectorViewChooser${view.title}`}
      >
        {view.title}
      </EuiContextMenuItem>
    );
  };

  renderSingleView() {
    return (
      <EuiTabs size="s">
        <EuiTab
          isSelected={true}
          data-test-subj={`inspectorViewChooser${this.props.selectedView.title}`}
        >
          {this.props.selectedView.title}
        </EuiTab>
      </EuiTabs>
    );
  }

  render() {
    const { views, selectedView } = this.props;

    if (views.length < 2) {
      return this.renderSingleView();
    }

    return (
      <EuiTabs size="s" data-test-subj="inspectorViewChooser">
        {views.map((view, index) => (
          <EuiTab
            key={index}
            onClick={() => this.props.onViewSelected(view)}
            isSelected={selectedView === view}
            data-test-subj={`inspectorViewChooser${view.title}`}
          >
            {view.title}
          </EuiTab>
        ))}
      </EuiTabs>
    );
  }
}
