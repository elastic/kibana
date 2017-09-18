import React, { cloneElement } from 'react';
import { get } from 'lodash';
import { set } from 'object-path-immutable';

const FilterWrap = (props) => {
  const {
    children,
    itemsPath,
    selectorPath,
    filters,
    action,
    ...rest,
  } = props;

  const {
    filterBy,
  } = get(props, selectorPath, {});

  // console.log('FilterWrap', props, filterBy, rest);

  let items = Array.from(get(props, itemsPath, []));
  if (items.length === 0) {
    return cloneElement(children, rest);
  }

  if (!!filterBy && Object.keys(filterBy).length) {
    items = items.filter(item => {
      return Object.keys(filters).every(filterKey => {
        const filterFn = filters[filterKey];
        const value = get(item, filterKey);
        const filterValue = filterBy[filterKey];

        // console.log(filterKey, value, filterValue);
        return filterFn(value, filterValue);
      });
    })
  }

  // console.log('FilterWrap filteredItems', items.length);

  const propsWithoutItems = {
    ...rest,
    filterBy,
    filter: (filter, fields) => action(selectorPath, {
      filterBy: {
        ...filterBy,
        ...filter,
      }
    }),
  };

  const propsToChild = set(propsWithoutItems, itemsPath, items);

  console.log('FilterWrap.propsToChild', propsToChild, rest);

  return cloneElement(children, propsToChild);
};

export const wrapWithFilterProps = ({ filters, selectorPath, itemsPath, action }) => {
  return (BaseComponent) => (props) => (
    <FilterWrap
      filters={filters}
      selectorPath={selectorPath}
      itemsPath={itemsPath}
      action={action}
      {...props}
    >
      <BaseComponent/>
    </FilterWrap>
  );
};
