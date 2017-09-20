import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { compose } from 'recompose';
import IndexPatternFields from './index-pattern-fields.component';

import { get, sortBy as sortByLodash, chunk } from 'lodash';
import React from 'react';

import {
  wrapWithFilterProps,
  wrapWithSortProps,
  wrapWithPaginateProps,
} from 'plugins/kibana/management/react/hocs';

import {
  change,
}  from 'plugins/kibana/management/react/store/actions/index-pattern-view';

import {
  changeSort,
  changeFilter,
  changePaginate,
} from 'plugins/kibana/management/react/store/actions/shared';

import {
  getPathToFields,
  getPathToFieldsTable,
  getFieldsTable,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));

const commonOpts = {
  selectorPath: getPathToFieldsTable(),
  itemsPath: getPathToFields(),
  action,
};

const Paginate = ({
  getState,
  setState,
  defaults,
  render,
}) => {
  const {
    page = defaults.page || 0,
    perPage = defaults.perPage || 10,
  } = getState();

  const paginateProps = {
    page,
    perPage,
    goToPage: page => setState(page, perPage),
    changePerPage: perPage => setState(0, perPage),
  };
  return render(paginateProps);
}

const Filter = ({
  getState,
  setState,
  filters,
  render,
}) => {
  const { filterBy = {} } = getState();
  const filterProps = {
    filterBy,
    filters,
    filter: (filter, fields) => setState(filter),
  };
  return render(filterProps);
}

const Sort = ({
  getState,
  setState,
  render,
}) => {
  const { sortBy, sortAsc } = getState();
  const sortProps = {
    sortBy,
    sortAsc,
    changeSort: field => {
      setState(field, sortBy === field ? !sortAsc : sortAsc);
    },
  };
  return render(sortProps);
}

const getFields = ({ fields, sortBy, sortAsc, filterBy, filters, page, perPage}) => {
  let reducedFields = Array.from(fields);

  // filter
  reducedFields = reducedFields.filter(item => {
    return Object.keys(filters).every(filterKey => {
      const filterFn = filters[filterKey];
      const value = get(item, filterKey);
      const filterValue = filterBy[filterKey];
      return filterFn(value, filterValue);
    });
  });

  // sort
  if (!!sortBy) {
    reducedFields = sortByLodash(reducedFields, sortBy);
    if (!!!sortAsc) {
      reducedFields.reverse();
    }
  }

  // paginate
  const numOfPages = Math.ceil(reducedFields.length / perPage);
  const pages = chunk(reducedFields, perPage);
  reducedFields = pages[page] || [];

  return reducedFields;
};

const getState = () => getFieldsTable(store.getState());
const setState = (action, ...data) => store.dispatch(action(...data));

const RapGame = (props) => {
  return (
    <Filter
      getState={getState}
      setState={setState.bind(null, changeFilter)}
      filters={{
        name: (value, filterValue) => !filterValue || value.includes(filterValue),
        type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
      }}
      render={filterProps =>
        <Sort
          getState={getState}
          setState={setState.bind(null, changeSort)}
          render={sortProps =>
            <Paginate
              defaults={{ page: 0, perPage: 10 }}
              getState={getState}
              setState={setState.bind(null, changePaginate)}
              render={paginateProps => {
                const fields = getFields({
                  fields: props.indexPattern.fields,
                  ...sortProps,
                  ...filterProps,
                  ...paginateProps
                });

                const indexPattern = {
                  ...props.indexPattern,
                  fields,
                };

                return (
                  <IndexPatternFields
                    {...sortProps}
                    {...filterProps}
                    {...paginateProps}
                    {...props}
                    indexPattern={indexPattern}
                  />
                );
              }}
            />
          }
        />
      }
    />
  )
}

export default compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
  ),
  wrapWithFilterProps({
    getState,
    setState: setState.bind(null, changeFilter),
    filters: {
      name: (value, filterValue) => !filterValue || value.includes(filterValue),
      type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
    },
  }),
  wrapWithSortProps({
    getState,
    setState: setState.bind(null, changeSort),
    defaults: {
      sortBy: 'name',
      sortAsc: true,
    },
  }),
  wrapWithPaginateProps({
    getState,
    setState: setState.bind(null, changePaginate),
    defaults: {
      perPage: 10,
      page: 0,
    },
  }),
  BaseComponent => props => {
    const fields = getFields({
      fields: props.indexPattern.fields,
      ...props,
    });

    const indexPattern = {
      ...props.indexPattern,
      fields,
    };

    return <BaseComponent {...props} indexPattern={indexPattern}/>
  }
)(IndexPatternFields);
