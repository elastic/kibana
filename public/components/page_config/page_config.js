import React from 'react';
import PropTypes from 'prop-types';

export const PageConfig = ({ setBackground, background }) => {

  return (
    <div className="canvas__page_config">
      <h5>Page Settings</h5>
      <a onClick={() => setBackground('#000')}>{ background }</a>
    </div>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
