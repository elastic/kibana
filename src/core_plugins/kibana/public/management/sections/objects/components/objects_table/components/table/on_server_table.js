import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  ColumnType,
  SelectionType
} from '@elastic/eui/lib/components/basic_table/basic_table';
import {
  defaults as paginationBarDefaults
} from '@elastic/eui/lib/components/basic_table/pagination_bar';
import { isBoolean, isString } from '@elastic/eui/lib/services/predicate';
import { Comparators } from '@elastic/eui/lib/services/sort';
import {
  Query,
  QueryType,
  SearchFiltersFiltersType,
  SearchBoxConfigPropTypes, EuiSearchBar
} from '@elastic/eui/lib/components/search_bar';
import { EuiSpacer } from '@elastic/eui/lib/components/spacer/spacer';

const OnServerTablePropTypes = {
  columns: PropTypes.arrayOf(ColumnType).isRequired,
  fetch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onSearchChanged: PropTypes.func,
  message: PropTypes.string,
  error: PropTypes.string,
  search: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
    defaultQuery: QueryType,
    box: PropTypes.shape(SearchBoxConfigPropTypes),
    filters: SearchFiltersFiltersType,
  })]),
  pagination: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.shape({
      pageSizeOptions: PropTypes.arrayOf(PropTypes.number)
    })
  ]),
  sorting: PropTypes.bool,
  selection: SelectionType
};

const initialQuery = (props) => {
  const { search } = props;
  if (!search) {
    return undefined;
  }
  const query = search.defaultQuery || '';
  return isString(query) ? Query.parse(query) : query;
};

const initialCriteria = (props) => {
  const { pagination } = props;
  return {
    page: !pagination ? undefined : {
      index: 0,
      size: pagination.pageSizeOptions ? pagination.pageSizeOptions[0] : paginationBarDefaults.pageSizeOptions[0]
    }
  };
};

export class OnServerTable extends React.Component {

  static propTypes = OnServerTablePropTypes;
  static defaultProps = {
    pagination: false,
    sorting: false
  };

  constructor(props) {
    super(props);

    const criteria = initialCriteria(props);
    const query = initialQuery(props);
    this.state = {
      data: this.computeData([], criteria, query),
      isFetchingData: false,
      query,
      criteria,
    };
  }

  componentWillMount() {
    this.fetchData();
  }

  componentWillReceiveProps(nextProps) {
    this.setState(prevState => {
      const data = this.computeData(nextProps.items, prevState.criteria);
      return { data };
    });
  }

  fetchData = async (
    criteria = this.state.criteria,
    query = this.state.query,
  ) => {
    this.setState({ isFetchingData: true });
    const items = await this.props.fetch(criteria, query);
    this.setState({
      data: this.computeData(items, criteria, query),
      isFetchingData: false,
    });
  }

  computeData(items, criteria, query) {
    if (!items) {
      return { items: [], totalCount: 0 };
    }
    if (query) {
      // items = Query.execute(query, items);
    }
    if (criteria.sort) {
      items = items.sort(Comparators.property(criteria.sort.field, Comparators.default(criteria.sort.direction)));
    }
    const totalCount = items.length;
    if (criteria.page) {
      const { index, size } = criteria.page;
      const from = index * size;
      items = items.slice(from, Math.min(from + size, items.length));
    }
    return { items, totalCount };
  }

  onCriteriaChange(criteria) {
    this.setState({ criteria });
    this.fetchData(criteria, this.state.query);
  }

  onQueryChange(query) {
    this.setState({ query });
    this.fetchData(this.state.criteria, query);
    this.props.onSearchChanged && this.props.onSearchChanged(query);
  }

  render() {
    const { criteria, data, isFetchingData } = this.state;
    const { message, error, selection } = this.props;
    const { items, totalCount } = data;
    const pagination = !this.props.pagination ? undefined : {
      pageIndex: criteria.page.index,
      pageSize: criteria.page.size,
      totalItemCount: totalCount,
      ...(isBoolean(this.props.pagination) ? {} : this.props.pagination)
    };
    const sorting = !this.props.sorting ? undefined : {
      sort: criteria.sort
    };
    const searchBar = this.resolveSearchBar();
    const table = (
      <EuiBasicTable
        items={message ? [] : items} // if message is configured, we force showing it instead of the items
        columns={this.props.columns}
        pagination={pagination}
        sorting={sorting}
        selection={selection}
        onChange={this.onCriteriaChange.bind(this)}
        error={error}
        loading={isFetchingData}
        noItemsMessage={message}
      />
    );

    if (!searchBar) {
      return table;
    }

    return (
      <div>
        {searchBar}
        <EuiSpacer size="l"/>
        {table}
      </div>
    );
  }

  resolveSearchBar() {
    const { search } = this.props;
    if (search) {
      const searchBarProps = isBoolean(search) ? {} : search;
      return (
        <EuiSearchBar
          onChange={this.onQueryChange.bind(this)}
          {...searchBarProps}
        />
      );
    }
  }
}
