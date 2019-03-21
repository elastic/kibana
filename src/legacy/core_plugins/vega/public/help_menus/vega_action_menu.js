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

import PropTypes from 'prop-types';

import React, {
  Component,
} from 'react';

import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export class VegaActionsMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const button = (
      <EuiButtonIcon
        iconType="wrench"
        onClick={this.onButtonClick}
        aria-label={
          <FormattedMessage
            id="vega.editor.vegaEditorOptionsButtonAriaLabel"
            defaultMessage="Vega editor options"
          />
        }
      />
    );

    const items = [
      (
        <EuiContextMenuItem
          key="hjson"
          onClick={(event) => { this.closePopover(); this.props.formatHJson(event); }}
        >
          <FormattedMessage
            id="vega.editor.reformatAsHJSONButtonLabel"
            defaultMessage="Reformat as HJSON"
          />
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="json"
          onClick={(event) => { this.closePopover(); this.props.formatJson(event); }}
        >
          <FormattedMessage
            id="vega.editor.reformatAsJSONButtonLabel"
            defaultMessage="Reformat as JSON, delete comments"
          />
        </EuiContextMenuItem>
      )
    ];

    return (
      <EuiPopover
        id="helpMenu"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={items}
        />
      </EuiPopover>
    );
  }
}

VegaActionsMenu.propTypes = {
  formatHJson: PropTypes.func.isRequired,
  formatJson: PropTypes.func.isRequired,
};
