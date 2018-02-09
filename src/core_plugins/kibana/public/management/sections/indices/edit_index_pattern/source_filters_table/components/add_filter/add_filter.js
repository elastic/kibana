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
    addFilter: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      filter: '',
    };
  }

  addFilter = () => {
    this.props.addFilter(this.state.filter);
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
            onChange={e => this.setState({ filter: e.target.value })}
            placeholder="source filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            onClick={this.addFilter}
          >
            Add
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
