import React, { cloneElement } from 'react';

const DebugWrap = (props) => {
  const {
    children,
    debugKey,
    ...rest,
  } = props;

  console.log('Debug', debugKey, rest);

  return cloneElement(children, rest);
};

export const debug = ({ key }) => {
  return (BaseComponent) => (props) => (
    <DebugWrap debugKey={key} {...props}>
      <BaseComponent/>
    </DebugWrap>
  );
};
