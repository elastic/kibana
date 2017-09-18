import React, { cloneElement } from 'react';
import { sortBy as sortByLodash, get } from 'lodash';
import { set } from 'object-path-immutable';

const SortWrap = (props) => {
  const {
    children,
    itemsPath,
    selectorPath,
    action,
    defaultSortBy,
    defaultSortAsc,
    ...rest,
  } = props;

  const sortBy = get(props, `${selectorPath}.sortBy`, defaultSortBy);
  const sortAsc = get(props, `${selectorPath}.sortAsc`, defaultSortAsc);

  // console.log('SortWrap', props, sortBy, sortAsc);

  const items = get(props, itemsPath);
  if (items === undefined) {
    return cloneElement(children, rest);
  }

  let sortedItems = items.slice(0);
  if (!!sortBy) {
    sortedItems = sortByLodash(sortedItems, sortBy);
    if (!!!sortAsc) {
      sortedItems.reverse();
    }
  }

  const propsWithoutItems = {
    ...rest,
    sortBy,
    sortAsc,
    changeSort: field => {
      if (sortBy === field) {
        action(selectorPath, { sortBy: field, sortAsc: !sortAsc });
      } else {
        action(selectorPath, { sortBy: field });
      }
    }
  };

  const propsToChild = set(propsWithoutItems, itemsPath, sortedItems);
  return cloneElement(children, propsToChild);
};

export const wrapWithSortProps = ({
  sortBy,
  sortAsc,
  selectorPath,
  itemsPath,
  action
}) => {
  return (BaseComponent) => (props) => (
    <SortWrap
      selectorPath={selectorPath}
      itemsPath={itemsPath}
      action={action}
      defaultSortBy={sortBy}
      defaultSortAsc={sortAsc}
      {...props}
    >
      <BaseComponent/>
    </SortWrap>
  );
};
