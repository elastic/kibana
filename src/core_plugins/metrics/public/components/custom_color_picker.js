import React, { Component, PropTypes } from 'react';
import reactCSS from 'reactcss';

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
    this.shouldComponentUpdate = shallowCompare.bind(this, this, arguments[0], arguments[1]);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(data) {
    this.props.onChange(data);
  }

  render() {
    const rgb = this.props.rgb;
    const styles = reactCSS({
      'default': {
        picker: {
          background: '#fff',
          borderRadius: '2px',
          boxShadow: '0 0 2px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.3)',
          boxSizing: 'initial',
          width: '275px',
          fontFamily: 'Menlo',
        },
        saturation: {
          width: '100%',
          paddingBottom: '55%',
          position: 'relative',
          borderRadius: '2px 2px 0 0',
          overflow: 'hidden',
        },
        Saturation: {
          radius: '2px 2px 0 0',
        },
        body: {
          padding: '16px 16px 12px',
        },
        controls: {
          display: 'flex',
        },
        color: {
          width: '32px',
        },
        swatch: {
          marginTop: '6px',
          width: '16px',
          height: '16px',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
        },
        active: {
          absolute: '0px 0px 0px 0px',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)',
          background: `rgba(${ rgb.r }, ${ rgb.g }, ${ rgb.b }, ${ rgb.a })`,
          zIndex: '2',
        },
        toggles: {
          flex: '1',
        },
        hue: {
          height: '10px',
          position: 'relative',
          marginBottom: '8px',
        },
        Hue: {
          radius: '2px',
        },
        alpha: {
          height: '10px',
          position: 'relative',
        },
        Alpha: {
          radius: '2px',
        },
        swatches: {
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '10px'
        }
      },
      'disableAlpha': {
        color: {
          width: '22px',
        },
        alpha: {
          display: 'none',
        },
        hue: {
          marginBottom: '0px',
        },
        swatch: {
          width: '10px',
          height: '10px',
          marginTop: '0px',
        },
      },
    }, this.props);

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
          onClick={handleSwatchChange}/>
      );
    });

    return (
      <div style={styles.picker} className="custom-picker">
        <div style={styles.saturation}>
          <Saturation
            style={styles.Saturation}
            { ...this.props }
            pointer={ChromePointerCircle}
            onChange={this.handleChange}
          />
        </div>
        <div style={styles.body}>
          <div style={styles.controls} className="flexbox-fix">
            <div style={styles.color}>
              <div style={styles.swatch}>
                <div style={styles.active} />
                <Checkboard />
              </div>
            </div>
            <div style={styles.toggles}>
              <div style={styles.hue}>
                <Hue
                  style={styles.Hue}
                  {...this.props}
                  pointer={ChromePointer}
                  onChange={this.handleChange}
                />
              </div>
              <div style={styles.alpha}>
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
          <div style={styles.swatches} className="flexbox-fix">
            {swatches}
          </div>
        </div>
      </div>
    );
  }
}

CustomColorPicker.defaultProps = {
  colors: ['#4D4D4D', '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#FCDC00',
    '#DBDF00', '#A4DD00', '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF',
    '#333333', '#808080', '#cccccc', '#D33115', '#E27300', '#FCC400',
    '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF',
    '#0F1419', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FB9E00',
    '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E',
  ],
};

CustomColorPicker.propTypes = {
  color: PropTypes.string,
  onChangeComplete: PropTypes.func,
  onChange: PropTypes.func
};

export default colorWrap(CustomColorPicker);
