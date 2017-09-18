import React, { cloneElement } from 'react';

const SelectorWrap = ({
  children,
  selector,
  ...rest,
}) => {
  return cloneElement(children, {
    ...rest,
    selector
  });
};

export const wrapWithSimpleProps = ({ selector }) => {
  return (BaseComponent) => (props) => (
    <SelectorWrap selector={selector} {...props}>
      <BaseComponent/>
    </SelectorWrap>
  );
};
