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

import './radio_button_group.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiButtonGroup,
  KuiButton
} from '@kbn/ui-framework/components';

export class RadioButtonGroup extends React.Component {

  constructor(props) {
    super(props);

    this.state = {};

    if (props.buttons.length > 0) {
      const matchingButton = props.buttons.find(button => {
        return props.selectedBtnLabel === button.label;
      });
      if (matchingButton) {
        this.state.selectedBtnLabel = props.selectedBtnLabel;
      } else {
        this.state.selectedBtnLabel = props.buttons[0].label;
      }
    }
  }

  renderButtons = () => {
    return this.props.buttons.map((button, index) => {
      const handleOnClick = () => {
        this.setState({
          selectedBtnLabel: button.label
        });
        button.onClick();
      };

      let buttonType = 'secondary';
      if (button.label === this.state.selectedBtnLabel) {
        buttonType = 'primary';
      }
      return (
        <KuiButton
          className="kuiRadioButton"
          buttonType={buttonType}
          onClick={handleOnClick}
          key={index}
          data-test-subj={button.dataTestSubj}
        >
          {button.label}
        </KuiButton>
      );
    });
  }

  render = () => {
    return (
      <KuiButtonGroup
        className="radioButtonGroup"
        isUnited
      >
        {this.renderButtons()}
      </KuiButtonGroup>
    );
  }
}

RadioButtonGroup.propTypes = {
  buttons: PropTypes.arrayOf(PropTypes.shape({
    onClick: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
    dataTestSubj: PropTypes.string
  })).isRequired,
  selectedBtnLabel: PropTypes.string
};
