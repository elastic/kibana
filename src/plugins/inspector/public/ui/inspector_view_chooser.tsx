/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
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
        toolTipPosition="left"
        data-test-subj={`inspectorViewChooser${view.title}`}
      >
        {view.title}
      </EuiContextMenuItem>
    );
  };

  renderViewButton() {
    return (
      <EuiButtonEmpty
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.toggleSelector}
        data-test-subj="inspectorViewChooser"
      >
        <FormattedMessage
          id="inspector.view"
          defaultMessage="View: {viewName}"
          values={{ viewName: this.props.selectedView.title }}
        />
      </EuiButtonEmpty>
    );
  }

  renderSingleView() {
    return (
      <EuiToolTip position="bottom" content={this.props.selectedView.help}>
        <FormattedMessage
          id="inspector.view"
          defaultMessage="View: {viewName}"
          values={{ viewName: this.props.selectedView.title }}
        />
      </EuiToolTip>
    );
  }

  render() {
    const { views } = this.props;

    if (views.length < 2) {
      return this.renderSingleView();
    }

    const triggerButton = this.renderViewButton();

    return (
      <EuiPopover
        id="inspectorViewChooser"
        button={triggerButton}
        isOpen={this.state.isSelectorOpen}
        closePopover={this.closeSelector}
        panelPaddingSize="none"
        anchorPosition="downRight"
        repositionOnScroll
      >
        <EuiContextMenuPanel items={views.map(this.renderView)} />
      </EuiPopover>
    );
  }
}
