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

/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
// The color picker is not yet accessible.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { EuiIconTip } from '@elastic/eui';
import { CustomColorPicker } from './custom_color_picker';
import { injectI18n } from '@kbn/i18n/react';

class ColorPickerUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayPicker: false,
      color: {},
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  handleChange(color) {
    const { rgb } = color;
    const part = {};
    part[this.props.name] = `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
    if (this.props.onChange) this.props.onChange(part);
  }

  handleClick() {
    this.setState({ displayPicker: !this.state.displayColorPicker });
  }

  handleClose() {
    this.setState({ displayPicker: false });
  }

  handleClear() {
    const part = {};
    part[this.props.name] = null;
    this.props.onChange(part);
  }

  renderSwatch() {
    if (!this.props.value) {
      return (
        <button
          aria-label={this.props.intl.formatMessage({
            id: 'tsvb.colorPicker.notAccessibleAriaLabel',
            defaultMessage: 'Color picker, not accessible',
          })}
          className="tvbColorPicker__swatch-empty"
          onClick={this.handleClick}
        />
      );
    }
    return (
      <button
        aria-label={this.props.intl.formatMessage(
          {
            id: 'tsvb.colorPicker.notAccessibleWithValueAriaLabel',
            defaultMessage: 'Color picker ({value}), not accessible',
          },
          {
            value: this.props.value,
          }
        )}
        style={{ backgroundColor: this.props.value }}
        className="tvbColorPicker__swatch"
        onClick={this.handleClick}
      />
    );
  }

  render() {
    const swatch = this.renderSwatch();
    const value = this.props.value || undefined;
    let clear;
    if (!this.props.disableTrash) {
      clear = (
        <div className="tvbColorPicker__clear" onClick={this.handleClear}>
          <EuiIconTip
            size="s"
            type="cross"
            color="danger"
            content={this.props.intl.formatMessage({
              id: 'tsvb.colorPicker.clearIconLabel',
              defaultMessage: 'Clear',
            })}
          />
        </div>
      );
    }
    return (
      <div className="tvbColorPicker" data-test-subj="tvbColorPicker">
        {swatch}
        {clear}
        {this.state.displayPicker ? (
          <div className="tvbColorPicker__popover">
            <div className="tvbColorPicker__cover" onClick={this.handleClose} />
            <CustomColorPicker color={value} onChangeComplete={this.handleChange} />
          </div>
        ) : null}
      </div>
    );
  }
}

ColorPickerUI.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disableTrash: PropTypes.bool,
  onChange: PropTypes.func,
};

export const ColorPicker = injectI18n(ColorPickerUI);
