import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
import { Popover } from '../popover';
import { FauxSelect } from '../faux_select';
import './font_picker.less';

const fonts = [
  {
    label: 'American Typewriter',
    value: `'American Typewriter', 'Courier New', Courier, Monaco, mono`,
  },
  { label: 'Arial', value: `'Arial, sans-serif` },
  {
    label: 'Baskerville',
    value: `Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif`,
  },
  {
    label: 'Book Antiqua',
    value: `'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif`,
  },
  { label: 'Brush Script', value: `'Brush Script MT', 'Comic Sans', sans-serif` },
  { label: 'Chalkboard', value: `Chalkboard, 'Comic Sans', sans-serif` },
  { label: 'Didot', value: `Didot, Georgia, Garamond, 'Times New Roman', Times, serif` },
  { label: 'Futura', value: `Futura, Impact, Helvetica, Arial, sans-serif` },
  {
    label: 'Gill Sans',
    value: `'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif`,
  },
  { label: 'Helvetica Neue', value: `'Helvetica Neue', Helvetica, Arial, sans-serif` },
  {
    label: 'Hoefler Text',
    value: `'Hoefler Text', Garamond, Georgia, 'Times New Roman', Times, serif`,
  },
  {
    label: 'Lucida Grande',
    value: `'Lucida Grande', 'Lucida Sans Unicode', Lucida, Verdana, Helvetica, Arial, sans-serif`,
  },
  { label: 'Myriad', value: `Myriad, Helvetica, Arial, sans-serif` },
  { label: 'Open Sans', value: `'Open Sans', Helvetica, Arial, sans-serif` },
  {
    label: 'Optima',
    value: `Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif`,
  },
  {
    label: 'Palatino',
    value: `Palatino, 'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif`,
  },
];

export const FontPicker = ({ onSelect, value, anchorPosition }) => {
  const selected = fonts.find(font => font.value === value) || { label: value, value };

  // TODO: replace faux select with better EUI custom select or dropdown when it becomes available
  const popoverButton = handleClick => (
    <FauxSelect handleClick={handleClick}>
      <div style={{ fontFamily: selected.value }}>{selected.label}</div>
    </FauxSelect>
  );

  return (
    <Popover
      id="font-picker-popover"
      button={popoverButton}
      panelClassName="canvas__font-picker--popover"
      anchorPosition={anchorPosition}
    >
      {() => (
        <div className="canvas__font-picker">
          {fonts.map(font => (
            <EuiLink
              key={font.label}
              className="canvas__font-picker--font"
              style={{ fontFamily: font.value }}
              onClick={() => onSelect(font.value)}
            >
              {font.label}
            </EuiLink>
          ))}
        </div>
      )}
    </Popover>
  );
};

FontPicker.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func,
  anchorPosition: PropTypes.string,
};
