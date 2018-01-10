import React from 'react';
import PropTypes from 'prop-types';
import { ColorPickerMini } from '../color_picker_mini';
import './page_config.less';

export const PageConfig = ({ setBackground, background }) => {
  return (
    <div className="canvas__page-config">
      <div>
        <label>Page Background</label>
      </div>

      <ColorPickerMini onChange={setBackground} value={background} />
    </div>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
