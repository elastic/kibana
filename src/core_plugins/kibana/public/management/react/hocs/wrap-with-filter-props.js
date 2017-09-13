import React, { cloneElement } from 'react';
import { sortBy as sortByLodash, get } from 'lodash';

const FilterWrap = (props) => {
  const {
    items,
    change,
    transientId,
    children,
    filterBy,
    filters,
  } = props;

  // console.log('FilterWrap', props);

  if (items === undefined) {
    return children;
  }

  let filteredItems = items;
  if (!!filterBy && Object.keys(filterBy).length) {
    filteredItems = filteredItems.filter(item => {
      return Object.keys(filters).every(filterKey => {
        const filterFn = filters[filterKey];
        const value = get(item, filterKey);
        const filterValue = filterBy[filterKey];

        return filterFn(value, filterValue);
      });
    })
  }

  // console.log('Filterwrap', filteredItems);

  return cloneElement(children, {
    ...props,
    items: filteredItems,
    filter: filter => change(transientId, {
      filterBy: {
        ...filterBy,
        ...filter,
      }
    }),
  });
};

export const wrapWithFilterProps = ({ filters }) => {
  return (BaseComponent) => (props) => (
    <FilterWrap filters={filters} {...props}>
      <BaseComponent/>
    </FilterWrap>
  );
};
