import React, { cloneElement } from 'react';
import { chunk } from 'lodash';

const PaginateWrap = (props) => {
  const {
    items,
    change,
    transientId,
    children,
    perPage,
    page
  } = props;

  console.log('PaginateWrap', props);

  if (items === undefined) {
    return children;
  }

  const numOfPages = Math.ceil(items.length / perPage);
  const pages = chunk(items, perPage);
  const paginatedItems = pages[page] || [];

  console.log('PaginateWrap more', pages, perPage, page);

  return cloneElement(children, {
    ...props,
    items: paginatedItems,
    numOfPages,
    goToPage: page => change(transientId, { page }),
    changePerPage: perPage => change(transientId, { perPage, page: 0 }),
  });
};

export const wrapWithPaginateProps = (defaultProps = {}) => {
  return (BaseComponent) => (props) => (
    <PaginateWrap {...defaultProps} {...props}>
      <BaseComponent/>
    </PaginateWrap>
  );
};
