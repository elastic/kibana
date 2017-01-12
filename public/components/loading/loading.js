import React from 'react';
import clock from './clock-o.svg';
import './loading.less';

export default () => {
  const style = {
    backgroundImage: `url("${clock}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
  };
  return (
    <div style={style} className="rework--loading"></div>
  );
};
