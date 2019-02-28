/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

class InspectorViewChooser extends Component {

  state = {
    isSelectorOpen: false
  };

  toggleSelector = () => {
    this.setState((prev) => ({
      isSelectorOpen: !prev.isSelectorOpen
    }));
  };

  closeSelector = () => {
    this.setState({
      isSelectorOpen: false
    });
  };

  renderView = (view, index) => {
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
  }

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
          id="common.ui.inspector.view"
          defaultMessage="View: {viewName}"
          values={{ viewName: this.props.selectedView.title }}
        />
      </EuiButtonEmpty>
    );
  }

  renderSingleView() {
    return (
      <EuiToolTip
        position="bottom"
        content={this.props.selectedView.help}
      >
        <FormattedMessage
          id="common.ui.inspector.view"
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
        ownFocus
        button={triggerButton}
        isOpen={this.state.isSelectorOpen}
        closePopover={this.closeSelector}
        panelPaddingSize="none"
        anchorPosition="downRight"
        repositionOnScroll
      >
        <EuiContextMenuPanel
          items={views.map(this.renderView)}
        />
      </EuiPopover>
    );
  }
}

InspectorViewChooser.propTypes = {
  views: PropTypes.array.isRequired,
  onViewSelected: PropTypes.func.isRequired,
  selectedView: PropTypes.object.isRequired,
};

export { InspectorViewChooser };
