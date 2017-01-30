import React from 'react';

export const ActiveButton = ({className, onClick, isActive}) => {
  const classes = [className];
  if (isActive) classes.push('active');
  return (<button type="button" className={classes.join(' ')} onClick={onClick}></button>);
};
