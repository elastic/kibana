import React from 'react';
import _ from 'lodash';
import './editable.less';

export default React.createClass({
  change(e) {
    this.props.onChange(e.target.value);
  },
  handleKeyPress(e) {
    const onDone = this.props.onDone || _.noop;
    if (e.key === 'Enter' || e.key === 'Escape') {
      this.refs.editableInput.blur();
      onDone();
    }
  },
  componentDidMount() {
    if (this.props.focus) this.refs.editableInput.focus();
  },
  render() {
    const {value, onChange, className, style} = this.props;

    return (
      <input
        type="text"
        ref="editableInput"
        className={['form-control rework--editable', className].join(' ')}
        value={value}
        onChange={this.change}
        style={style}
        onKeyDown={this.handleKeyPress}/>
    );
  }
});
