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
import React, { Component } from 'react';

import { ColorWrap as colorWrap, Saturation, Hue, Alpha, Checkboard } from 'react-color/lib/components/common';
import ChromeFields from 'react-color/lib/components/chrome/ChromeFields';
import ChromePointer from 'react-color/lib/components/chrome/ChromePointer';
import ChromePointerCircle from 'react-color/lib/components/chrome/ChromePointerCircle';
import CompactColor from 'react-color/lib/components/compact/CompactColor';
import color from 'react-color/lib/helpers/color';
import shallowCompare from 'react-addons-shallow-compare';

export class CustomColorPicker extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(nextProps, nextState);
  }

  handleChange(data) {
    this.props.onChange(data);
  }

  render() {
    const rgb = this.props.rgb;

    const styles = {
      active: {
        background: `rgba(${ rgb.r }, ${ rgb.g }, ${ rgb.b }, ${ rgb.a })`,
      },
      Saturation: {
        radius: '2px 2px 0 0 '
      },
      Hue: {
        radius: '2px',
      },
      Alpha: {
        radius: '2px',
      }
    };

    const handleSwatchChange = (data) => {
      if (data.hex) {
        color.isValidHex(data.hex) && this.props.onChange({
          hex: data.hex,
          source: 'hex',
        });
      } else {
        this.props.onChange(data);
      }
    };

    const swatches = this.props.colors.map((c) => {
      return (
        <CompactColor
          key={c}
          color={c}
          onClick={handleSwatchChange}
        />
      );
    });

    return (
      <div className="tvbColorPickerPopUp">
        <div className="tvbColorPickerPopUp__saturation">
          <Saturation
            style={styles.Saturation}
            {...this.props}
            pointer={ChromePointerCircle}
            onChange={this.handleChange}
          />
        </div>
        <div className="tvbColorPickerPopUp__body">
          <div className="tvbColorPickerPopUp__controls">
            <div className={this.props.disableAlpha ? 'tvbColorPickerPopUp__color-disableAlpha' : 'tvbColorPickerPopUp__color'}>
              <div className={this.props.disableAlpha ? 'tvbColorPickerPopUp__swatch-disableAlpha' : 'tvbColorPickerPopUp__swatch'}>
                <div className="tvbColorPickerPopUp__active" />
                <Checkboard />
              </div>
            </div>
            <div className="tvbColorPickerPopUp__toggles">
              <div className={this.props.disableAlpha ? 'tvbColorPickerPopUp__hue-disableAlpha' : 'tvbColorPickerPopUp__hue'}>
                <Hue
                  style={styles.Hue}
                  {...this.props}
                  pointer={ChromePointer}
                  onChange={this.handleChange}
                />
              </div>
              <div className={this.props.disableAlpha ? 'tvbColorPickerPopUp__alpha-disableAlpha' : 'tvbColorPickerPopUp__alpha'}>
                <Alpha
                  style={styles.Alpha}
                  {...this.props}
                  pointer={ChromePointer}
                  onChange={this.handleChange}
                />
              </div>
            </div>
          </div>
          <ChromeFields
            {...this.props}
            onChange={this.handleChange}
            disableAlpha={this.props.disableAlpha}
          />
          <div className="tvbColorPickerPopUp__swatches">
            {swatches}
          </div>
        </div>
      </div>
    );
  }
}

CustomColorPicker.defaultProps = {
  colors: [
    '#4D4D4D', '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#FCDC00',
    '#DBDF00', '#A4DD00', '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF',
    '#333333', '#808080', '#cccccc', '#D33115', '#E27300', '#FCC400',
    '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF',
    '#0F1419', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FB9E00',
    '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E',
  ],
};

CustomColorPicker.propTypes = {
  color: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onChangeComplete: PropTypes.func,
  onChange: PropTypes.func
};

export default colorWrap(CustomColorPicker);
