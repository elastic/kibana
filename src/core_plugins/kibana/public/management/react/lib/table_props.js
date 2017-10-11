import { Component } from 'react';
import { sortBy as sortByLodash, chunk } from 'lodash';

export class TableProps extends Component {
  constructor(props) {
    super(props);

    const {
      page = 0,
      perPage = 10,
      filterBy = {},
      sortBy,
      sortAsc = true
    } = this.props;

    this.state = {
      page,
      perPage,
      perPageToggleOpened: false,
      filterBy,
      sortBy,
      sortAsc,
    };
  }

  setPage = (page) => this.setState({ page })
  setPerPage = (perPage) => this.setState({ perPage })
  openPerPageToggle = () => this.setState({ perPageToggleOpened: true })
  closePerPageToggle = () => this.setState({ perPageToggleOpened: false })
  setFilterBy = (filterBy) => {
    this.setState(state => {
      return {
        ...state,
        filterBy: {
          ...state.filterBy,
          ...filterBy,
        }
      };
    });
  }

  setSortBy = (sortBy) => {
    this.setState(state => ({
      sortBy,
      sortAsc: state.sortBy === sortBy ? !state.sortAsc : state.sortAsc
    }));
  }

  getItems = () => {
    const { sortBy, sortAsc, page, perPage, filterBy } = this.state;
    const { filters } = this.props;

    let items = Array.from(this.props.items);

    const numOfPages = Math.ceil(items.length / perPage);

    // filter
    items = items.filter(item => filters.every(filter => filter(item, filterBy)));

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
    const { page, perPage, perPageToggleOpened, sortBy, sortAsc, filterBy } = this.state;

    const tableProps = {
      page,
      perPage,
      // perPageIncrements,
      perPageToggleOpened,
      sortBy,
      sortAsc,
      numOfPages,
      filterBy,
      items,
      setPage: this.setPage,
      setPerPage: this.setPerPage,
      setFilterBy: this.setFilterBy,
      setSortBy: this.setSortBy,
      openPerPageToggle: this.openPerPageToggle,
      closePerPageToggle: this.closePerPageToggle,
    };

    return this.props.render(tableProps);
  }
}
