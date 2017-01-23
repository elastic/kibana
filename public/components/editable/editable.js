import React from 'react';
import _ from 'lodash';
import './editable.less';

export default React.createClass({
  change(e) {
    this.props.onChange(e.target.value);
  },
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.refs.editableInput.blur();
    }
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
        onKeyPress={this.handleKeyPress}/>
    );
  }
});
