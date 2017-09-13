import React, { cloneElement } from 'react';
import { sortBy as sortByLodash, get } from 'lodash';

const RenameWrap = (props) => {
  const {
    children,
    from,
    to,
  } = props;

  const renamed = {
    [to]: get(props, from)
  };

  // console.log('RenameWrap', renamed, props, from);

  return cloneElement(children, {
    ...props,
    ...renamed,
  });
};

export const rename = ({ from, to }) => {
  return (BaseComponent) => (props) => (
    <RenameWrap {...props} from={from} to={to}>
      <BaseComponent/>
    </RenameWrap>
  );
};
