import React from 'react';
import PropTypes from 'prop-types';
import { find } from 'lodash';
import './font_picker.less';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { FauxSelect } from '../faux_select';

const fonts = [
  { label: 'American Typewriter',  value: `'American Typewriter', 'Courier New', Courier, Monaco, mono` },
  { label: 'Arial',                value: `'Arial, sans-serif` },
  { label: 'Baskerville',          value: `Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif` },
  { label: 'Book Antiqua',         value: `'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif` },
  { label: 'Brush Script',         value: `'Brush Script MT', 'Comic Sans', sans-serif` },
  { label: 'Chalkboard',           value: `Chalkboard, 'Comic Sans', sans-serif` },
  { label: 'Didot',                value: `Didot, Georgia, Garamond, 'Times New Roman', Times, serif` },
  { label: 'Futura',               value: `Futura, Impact, Helvetica, Arial, sans-serif` },
  { label: 'Gill Sans',            value: `'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif` },
  { label: 'Helvetica Neue',       value: `'Helvetica Neue', Helvetica, Arial, sans-serif` },
  { label: 'Hoefler Text',         value: `'Hoefler Text', Garamond, Georgia, 'Times New Roman', Times, serif` },
  { label: 'Lucida Grande',        value: `'Lucida Grande', 'Lucida Sans Unicode', Lucida, Verdana, Helvetica, Arial, sans-serif` },
  { label: 'Myriad',               value: `Myriad, Helvetica, Arial, sans-serif` },
  { label: 'Open Sans',            value: `'Open Sans', Helvetica, Arial, sans-serif` },
  { label: 'Optima',               value: `Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif` },
  { label: 'Palatino',             value: `Palatino, 'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif` },
];

export const FontPicker = ({ onSelect, value, placement }) => {

  const selected = find(fonts, { value }) || { label: value, value };

  const picker = (
    <Popover className="canvas__font-picker--popover" id="popover-trigger-click" style={{ width: 207 }}>
      <div className="canvas__font-picker">
        { fonts.map(font => ( // TODO: Make a custom select using bootstrap dropdowns. This is lame and causes inconsistent styling in popover selects
          <div
            key={font.label}
            className="canvas__font-picker--font"
            style={{ fontFamily: font.value }}
            onClick={() => onSelect(font.value)}
          >
            {font.label}
          </div>
        ))}
      </div>
    </Popover>
  );

  return (
    <OverlayTrigger
      rootClose
      overlay={picker}
      placement={placement || 'bottom'}
      trigger="click"
    >
      <div style={{ display: 'inline-block' }}>
        <FauxSelect>
          <div style={{ fontFamily: selected.value }}>{ selected.label }</div>
        </FauxSelect>
      </div>
    </OverlayTrigger>
  );
};

FontPicker.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func,
  placement: PropTypes.string,
};
