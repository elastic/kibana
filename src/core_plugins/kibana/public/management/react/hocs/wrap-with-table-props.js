import React, { Component } from 'react';
import { get, sortBy as sortByLodash, chunk } from 'lodash';
import { set } from 'object-path-immutable';

export const wrapWithTableProps = ({ page, perPage, filterBy = {}, filters, sortBy, sortAsc, itemsKey = 'items' }) => {
  return BaseComponent => class extends Component {
    constructor(props) {
      super(props);
      this.state = {
        page,
        perPage,
        filterBy,
        sortBy,
        sortAsc,
      };
    }

    setPage = (page) => {
      this.setState({ page });
    }

    setPerPage = (perPage) => {
      this.setState({ perPage });
    }

    setFilterBy = (filterBy) => {
      this.setState({ filterBy });
    }

    setSort = (sortBy) => {
      this.setState(state => ({ sortBy, sortAsc: state.sortBy === sortBy ? !state.sortAsc : state.sortAsc }));
    }

    getItems = () => {
      const { sortBy, sortAsc, page, perPage, filterBy } = this.state;

      let items = Array.from(get(this.props, itemsKey, []));

      const numOfPages = Math.ceil(items.length / perPage);

      // filter
      if (!!filters) {
        items = items.filter(item => {
          return Object.keys(filters).every(filterKey => {
            const filterFn = filters[filterKey];
            const value = get(item, filterKey);
            const filterValue = filterBy[filterKey];
            return filterFn(value, filterValue);
          });
        });
      }

      // sort
      if (!!sortBy) {
        items = sortByLodash(items, sortBy);
        if (!!!sortAsc) {
          items.reverse();
        }
      }

      // paginate
      const pages = chunk(items, perPage);
      items = pages[page] || [];

      return { items, numOfPages };
    }

    render() {
      const { items, numOfPages } = this.getItems();
      const tableProps = {
        page: this.state.page,
        perPage: this.state.perPage,
        sortBy: this.state.sortBy,
        sortAsc: this.state.sortAsc,
        numOfPages,
        setPage: this.setPage,
        setPerPage: this.setPerPage,
        setFilterBy: this.setFilterBy,
        setSort: this.setSort,
      };

      const tablePropsWithItems = set(tableProps, itemsKey, items);

      return <BaseComponent {...this.props} {...tablePropsWithItems} />
    }
  }
};
