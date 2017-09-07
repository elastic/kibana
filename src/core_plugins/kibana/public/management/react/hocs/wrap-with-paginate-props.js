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
  const paginatedItems = pages[page - 1];

  return cloneElement(children, {
    ...props,
    items: paginatedItems,
    numOfPages,
    goToPreviousPage: () => {
      let previousPage = page - 1;
      previousPage = previousPage < 1
        ? numOfPages
        : previousPage;
      change(transientId, { page: previousPage });
    },
    goToNextPage: () => {
      let nextPage = page + 1;
      nextPage = nextPage > pages
        ? 1
        : nextPage;
      change(transientId, { page: nextPage });
    }
  });
};

export const wrapWithPaginateProps = (defaultProps = {}) => {
  return (BaseComponent) => (props) => (
    <PaginateWrap {...defaultProps} {...props}>
      <BaseComponent/>
    </PaginateWrap>
  );
};
