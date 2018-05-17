import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
  EuiBasicTable,
  EuiLink,
} from '@elastic/eui';

export class SavedObjectFinder extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      page: 1,
      perPage: 20,
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchItems();
  }

  onTableChange = ({ page }) => {
    this.setState({
      page: page.index,
      perPage: page.pageSize,
    });
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(
      this.props.savedObjectType,
      filter,
      this.state.page,
      this.state.perPage);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        isFetchingItems: false,
        items: response.savedObjects.map(savedObject => {
          return {
            title: savedObject.attributes.title,
            id: savedObject.id,
            type: savedObject.type,
          };
        }),
        totalItems: response.total,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch.bind(null, this.state.filter));
  }

  renderSearchBar() {
    const toolsRight = [];
    if (this.props.addNewButton) {
      toolsRight.push(this.props.addNewButton);
    }
    return (
      <EuiSearchBar
        onChange={(query) => {
          this.setState({
            filter: query.text
          }, this.fetchItems);
        }}
        box={{ incremental: true, ['data-test-subj']: 'savedObjectFinderSearchInput' }}
        toolsRight={toolsRight}
      />
    );
  }

  renderTable() {
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [10, 20, 50],
    };
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        render: (field, record) => (
          <EuiLink
            onClick={() => {
              this.props.onChoose(record.id, record.type);
            }}
            data-test-subj={`addPanel${field.split(' ').join('-')}`}
          >
            {field}
          </EuiLink>
        )
      }
    ];
    return (
      <EuiBasicTable
        items={this.state.items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        pagination={pagination}
        onChange={this.onTableChange}
        noItemsMessage={this.props.noItemsMessage}
      />
    );
  }

  render() {
    return (
      <React.Fragment>
        {this.renderSearchBar()}
        {this.renderTable()}
      </React.Fragment>
    );
  }
}

SavedObjectFinder.propTypes = {
  addNewButton: PropTypes.node,
  onChoose: PropTypes.func.isRequired,
  find: PropTypes.func.isRequired,
  noItemsMessage: PropTypes.node,
  savedObjectType: PropTypes.oneOf(['visualization', 'search']).isRequired,
};
