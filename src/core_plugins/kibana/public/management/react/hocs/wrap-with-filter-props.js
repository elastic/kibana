import React, { cloneElement } from 'react';
import { sortBy as sortByLodash, get } from 'lodash';

const FilterWrap = (props) => {
  const {
    items,
    change,
    transientId,
    children,
    filterBy,
    filterKey,
  } = props;

  console.log('FilterWrap', props);

  if (items === undefined) {
    return children;
  }

  const filteredItems = !!filterBy
    ? items.filter(item => get(item, filterKey).includes(filterBy))
    : items;

  console.log('Filterwrap', filteredItems);

  return cloneElement(children, {
    ...props,
    items: filteredItems,
    filter: filterBy => change(transientId, { filterBy }),
  });
};

export const wrapWithFilterProps = ({ filterKey }) => {
  return (BaseComponent) => (props) => (
    <FilterWrap {...props} filterKey={filterKey}>
      <BaseComponent/>
    </FilterWrap>
  );
};
