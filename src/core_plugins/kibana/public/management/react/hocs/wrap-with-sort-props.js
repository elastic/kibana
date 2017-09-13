import React, { cloneElement } from 'react';
import { sortBy as sortByLodash } from 'lodash';

const SortWrap = (props) => {
  const {
    items,
    change,
    transientId,
    children,
    sortBy,
    sortAsc
  } = props;

  // console.log('SortWrap', props);

  if (items === undefined) {
    return children;
  }

  let sortedItems = items.slice(0);
  if (!!sortBy) {
    sortedItems = sortByLodash(sortedItems, sortBy);
    if (!!!sortAsc) {
      sortedItems.reverse();
    }
  }

  return cloneElement(children, {
    ...props,
    items: sortedItems,
    changeSort: field => {
      if (sortBy === field) {
        change(transientId, { sortAsc: !sortAsc });
      } else {
        change(transientId, { sortBy: field });
      }
    }
  });
};

export const wrapWithSortProps = (defaultProps) => {
  const { sortBy, sortAsc } = defaultProps || {};
  return (BaseComponent) => (props) => (
    <SortWrap sortBy={sortBy} sortAsc={sortAsc} {...props}>
      <BaseComponent/>
    </SortWrap>
  );
};
