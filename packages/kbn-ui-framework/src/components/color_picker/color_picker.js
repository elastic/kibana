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

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ChromePicker } from 'react-color';

import { KuiOutsideClickDetector } from '../outside_click_detector';

import { KuiColorPickerSwatch } from './color_picker_swatch';

export class KuiColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showColorSelector: false,
    };
  }

  closeColorSelector = () => {
    this.setState({ showColorSelector: false });
  };

  toggleColorSelector = () => {
    this.setState({ showColorSelector: !this.state.showColorSelector });
  };

  handleColorSelection = (color) => {
    this.props.onChange(color.hex);
  };

  getColorLabel() {
    const { color } = this.props;
    const colorValue = color === null ? '(transparent)' : color;
    return (
      <div
        className="kuiColorPicker__label"
        aria-label={`Color selection is ${ colorValue }`}
      >
        { colorValue }
      </div>
    );
  }

  render() {
    const { color, className, showColorLabel } = this.props;
    const classes = classNames('kuiColorPicker', className);
    return (
      <KuiOutsideClickDetector onOutsideClick={this.closeColorSelector}>
        <div
          className={classes}
          data-test-subj={this.props['data-test-subj']}
        >
          <div
            className="kuiColorPicker__preview"
            onClick={this.toggleColorSelector}
          >
            <KuiColorPickerSwatch color={color} aria-label={this.props['aria-label']} />
            { showColorLabel ? this.getColorLabel() : null }
          </div>
          {
            this.state.showColorSelector ?
              <div className="kuiColorPickerPopUp" data-test-subj="colorPickerPopup">
                <ChromePicker
                  color={color ? color : '#ffffff'}
                  disableAlpha={true}
                  onChange={this.handleColorSelection}
                />
              </div>
              : null
          }
        </div>
      </KuiOutsideClickDetector>
    );
  }
}

KuiColorPicker.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  showColorLabel: PropTypes.bool,
};

KuiColorPicker.defaultProps = {
  'aria-label': 'Select a color',
  showColorLabel: true,
};
