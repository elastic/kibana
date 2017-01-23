import React from 'react';
import StdAgg from './std_agg';
import aggToComponent from '../lib/agg_to_component';
import { sortable } from 'react-anything-sortable';
export default sortable(React.createClass({
  render() {
    const { model } = this.props;
    let Component = aggToComponent[model.type];
    if (!Component) {
      Component = StdAgg;
    }
    const style = Object.assign({ cursor: 'default' }, this.props.style);
    return (
      <div
        className={this.props.className}
        style={style}
        onMouseDown={this.props.onMouseDown}
        onTouchStart={this.props.onTouchStart}>
        <Component {...this.props}/>
      </div>
    );
  }
}));
