import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
} from '@elastic/eui';

import { getCategoryName } from '../../lib';

export class Search extends PureComponent {

  static propTypes = {
    categories: PropTypes.array.isRequired,
    query: PropTypes.object.isRequired,
    onQueryChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    const { categories } = props;
    this.categories = categories.map(category => {
      return {
        value: category,
        name: getCategoryName(category),
      };
    });
  }

  render() {
    const { query, onQueryChange } = this.props;

    const box = {
      incremental: true,
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'category',
        name: 'Category',
        multiSelect: 'or',
        options: this.categories,
      }
    ];

    return (
      <EuiSearchBar
        box={box}
        filters={filters}
        onChange={onQueryChange}
        query={query}
      />
    );
  }
}
