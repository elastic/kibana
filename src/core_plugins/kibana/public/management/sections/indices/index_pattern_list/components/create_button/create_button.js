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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export class CreateButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPopoverOpen: false,
    };
  }

  static propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string.isRequired,
      description: PropTypes.string,
      onClick: PropTypes.func.isRequired,
    })),
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const { options, children } =  this.props;
    const { isPopoverOpen } =  this.state;

    if(!options || !options.length) {
      return null;
    }

    if(options.length === 1) {
      return (
        <EuiButton
          fill={true}
          size={'s'}
          onClick={options[0].onClick}
        >
          {children}
        </EuiButton>
      );
    }

    const button = (
      <EuiButton
        fill={true}
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.togglePopover}
      >
        {children}
      </EuiButton>
    );

    if(options.length > 1) {
      return (
        <EuiPopover
          id="singlePanel"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            items={options.map(option => {
              return (
                <EuiContextMenuItem
                  key={option.text}
                  onClick={option.onClick}
                >
                  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }}>
                    <EuiDescriptionListTitle>
                      {option.text}
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {option.description}
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiContextMenuItem>
              );
            })}
          />
        </EuiPopover>
      );
    }
  }
}
