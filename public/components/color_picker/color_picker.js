import React from 'react';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';

import './color_picker.less';

export const ColorPicker = ({ value, colorRows, onChange }) => {

  const rows = colorRows || [
    [ '#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35' ],
    [ '#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643' ],
    [ '#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f' ],
    [ '#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f' ],
    [ '#000000', '#444444', '#777777', '#BBBBBB', '#FFFFFF', 'rgba(0,0,0,0)' ], // 'transparent'
  ];


  let selectColor;
  try {
    selectColor = chroma.contrast(value, '#000') < 4.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  } catch (e) {
    selectColor = 'rgba(0,0,0,0.5)';
  }

  const table = (
    <div>
      {
        rows.map((row, i) => (
          <div key={i}>
            {
              row.map(color => {
                const classNames = ['fa fa-stack-2x'];
                classNames.push(color === 'rgba(0,0,0,0)' ? 'fa fa-ban' : 'fa fa-circle');

                const fontColor = color === 'rgba(0,0,0,0)' ? '#000000' : color;
                return (
                  <span key={color} className="fa-stack" onClick={() => onChange(color)}>
                    <i className={ classNames.join(' ')} style={{ color: fontColor }}/>
                    { value !== color ? null :
                      (<i className="fa fa-circle-o fa-stack-2x" style={{ color: selectColor }}/>)
                    }
                  </span>
                );
              })
            }
          </div>
        ))
      }
    </div>
  );

  return (
    <div className="canvas__color-picker">
      {table}
    </div>
  );
};

ColorPicker.propTypes = {
  value: PropTypes.string,
  colorRows: PropTypes.array,
  onChange: PropTypes.func,
};
