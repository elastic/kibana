import $ from 'jquery';
import React from 'react';
import './fullscreen.less';

export default ({width, height, children}) => {
  const windowHeight = $(window).height();
  const windowWidth = $(window).width();
  const windowRatio = windowWidth / windowHeight;
  const ratio = width / height;
  const scale = (windowRatio > ratio) ? (windowHeight / height) : (windowWidth / width);


  const newHeight = height * scale;
  const newWidth = width * scale;

  const offsetTop = (windowHeight - newHeight) / 2;
  const offsetLeft = (windowWidth - newWidth) / 2;

  // You could just do the fucking math here. Not that hard to position this absolutely without a bunch of
  // stupid flexbox tricks.

  const style = {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'absolute',
    top: offsetTop,
    left: offsetLeft
  };

  return (
    <div className="rework--fullscreen">
      <div style={style}>
        {children}
      </div>
    </div>

  );
};
