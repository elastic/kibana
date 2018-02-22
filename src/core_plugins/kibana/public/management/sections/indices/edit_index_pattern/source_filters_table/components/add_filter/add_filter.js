import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButton,
} from '@elastic/eui';

export class AddFilter extends Component {
  static propTypes = {
    onAddFilter: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      filter: '',
    };
  }

  onAddFilter = () => {
    this.props.onAddFilter(this.state.filter);
    this.setState({ filter: '' });
  }

  render() {
    const { filter } = this.state;

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={10}>
          <EuiFieldText
            fullWidth
            value={filter}
            onChange={e => this.setState({ filter: e.target.value.trim() })}
            placeholder="source filter, accepts wildcards (e.g., `user*` to filter fields starting with 'user')"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            isDisabled={filter.length === 0}
            onClick={this.onAddFilter}
          >
            Add
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
