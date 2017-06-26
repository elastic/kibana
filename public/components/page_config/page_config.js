import React from 'react';
import PropTypes from 'prop-types';
import { ColorPicker } from '../color_picker';

export const PageConfig = ({ setBackground, background }) => {

  return (
    <div className="canvas__page_config">
      <h5>Page Settings</h5>
      <ColorPicker onChange={setBackground} value={background}/>
    </div>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
