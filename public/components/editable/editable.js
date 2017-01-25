import React from 'react';
import _ from 'lodash';
import './editable.less';

// Must have value & onDone, onChange is optional. If no onChange is specificed this will maintain
// internal state, which, if something else changes your value, could get dicey

export default React.createClass({
  getInitialState() {
    return {value: this.props.value};
  },
  componentWillReceiveProps(nextProps) {
    if (this.props.value !== nextProps.value) this.setState({value: nextProps.value});
  },
  componentDidMount() {
    if (this.props.focus) this.refs.editableInput.focus();
  },
  change(e) {
    const onChange = this.props.onChange || _.noop;
    onChange(e.target.value);
    this.setState({value: e.target.value});
  },
  handleKeyPress(e) {
    const onDone = this.props.onDone || _.noop;
    if (e.key === 'Enter' || e.key === 'Escape') {
      this.refs.editableInput.blur();
      onDone(this.state.value);
    }
  },
  render() {
    const {className, style} = this.props;
    const {value} = this.state;

    return (
      <input
        type="text"
        ref="editableInput"
        className={['form-control rework--editable', className].join(' ')}
        value={value}
        onChange={this.change}
        onKeyDown={this.handleKeyPress}
        style={style}/>
    );
  }
});
