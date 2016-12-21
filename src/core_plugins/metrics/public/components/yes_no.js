import React from 'react';
export default React.createClass({
  handleChange(value) {
    const { name } = this.props;
    return (e) => {
      const parts = {};
      parts[name] = value;
      this.props.onChange(parts);
    };
  },

  render() {
    const { name, value } = this.props;
    return (
      <div className="thor__yes_no">
        <label>
          <input
            type="radio"
            name={name}
            checked={Boolean(value)}
            value="yes"
            onChange={this.handleChange(1)}/>
          Yes</label>
        <label>
          <input
            type="radio"
            name={name}
            checked={!Boolean(value)}
            value="no"
            onChange={this.handleChange(0)}/>
          No</label>
      </div>
    );
  }
});
