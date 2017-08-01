import React from 'react';
import PropTypes from 'prop-types';
import { ColorPicker } from '../color_picker';

export const PageConfig = ({ setBackground, background }) => {

  return (
    <div className="canvas__page_config">
      <h4>Page</h4>
      <ColorPicker onChange={setBackground} value={background}/>
      <label>Background Color</label>
    </div>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
