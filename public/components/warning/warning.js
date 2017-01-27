import React from 'react';
import warning from './warning.svg';
import './warning.less';

export default ({children}) => {
  const style = {
    backgroundImage: `url("${warning}")`,
  };
  return (
    <div style={style} className="rework--warning">
      <div className="rework--warning-content">
        {children}
      </div>
    </div>
  );
};
