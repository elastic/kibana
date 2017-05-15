import React from 'react';
import PropTypes from 'prop-types';

export function statefulInput(fieldname) {
  return (Comp) => {
    class WrappedControlledInput extends React.PureComponent {
      constructor(props) {
        super(props);

        this.state = {
          value: props[fieldname],
        };
      }

      componentWillReceiveProps(nextProps) {
        console.log({nextProps})
        this.setState({ value: nextProps[fieldname] });
      }

      handleChange = (ev) => {
        this.setState({ value: ev.target.value });
      }

      render() {
        const passedProps = {
          ...this.props,
          [fieldname]: this.state.value,
          updateValue: this.handleChange,
        };

        return (<Comp { ...passedProps } />);
      }
    }

    WrappedControlledInput.propTypes = {
      [fieldname]: PropTypes.string,
    };

    return WrappedControlledInput;
  };
}
