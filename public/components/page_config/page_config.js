import React from 'react';
import PropTypes from 'prop-types';
import { WorkpadColorPicker } from '../workpad_color_picker';

export const PageConfig = ({ setBackground, background, colors }) => {

  return (
    <div className="canvas__page_config">
      <h4>Page</h4>
      <WorkpadColorPicker colors={colors} onChange={setBackground} value={background}/>
      <label>Background Color</label>
    </div>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
  colors: PropTypes.array,
};
