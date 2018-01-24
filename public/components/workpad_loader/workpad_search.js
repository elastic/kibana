import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { debounce } from 'lodash';

export class WorkpadSearch extends React.PureComponent {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    initialText: PropTypes.string,
  };

  state = {
    searchText: this.props.initialText || '',
  };

  triggerChange = debounce(this.props.onChange, 150);

  setSearchText = ev => {
    const text = ev.target.value;
    this.setState({ searchText: text });
    this.triggerChange(text);
  };

  render() {
    return (
      <FormControl
        type="text"
        placeholder="Find Workpads"
        value={this.state.searchText}
        onChange={this.setSearchText}
      />
    );
  }
}
