import $ from 'jquery';
import React from 'react';

export default ({width, height, children}) => {
  const windowHeight = $(window).height();
  const windowWidth = $(window).width();
  const windowRatio = windowWidth / windowHeight;
  const ratio = width / height;
  const scale = (windowRatio > ratio) ? (windowHeight / height) : (windowWidth / width);

  const style = {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'fixed',
    backgroundColor: '#000',
    transform: `scale(${scale})`,
    transformOrigin: scale > 1 ? undefined : 'top'
  };

  return (
    <div className="rework--fullscreen" style={style}>
      {children}
    </div>
  );
};
