import React, { Component } from 'react';
import {
  KuiFieldText,
} from 'ui_framework/components';

class InputPatternInputField extends Component {
  constructor(props) {
    super(props);
    this.state = {
      appendedWildcard: false,
      value: undefined,
    };
  }

  onChange = (e) => {
    let appendedWildcard = this.state.appendedWildcard;
    let value = e.target.value;

    if (value === '*' || value === '') {
      if (this.state.appendedWildcard) {
        value = '';
        appendedWildcard = false;
      }
    } else if (!appendedWildcard) {
      value += '*';
      appendedWildcard = true;

      const input = this.input;
      setTimeout(() => input.setSelectionRange(value.length - 1, value.length - 1));
    }

    this.setState({ value, appendedWildcard });
    this.props.onChange(value);
  }

  render() {
    const { children, ...rest } = this.props;

    return (
      <KuiFieldText
        {...rest}
        value={this.state.value}
        inputRef={(input) => { this.input = input; }}
        onChange={this.onChange}
      >
        {children}
      </KuiFieldText>
    );
  }
}

export { InputPatternInputField };
