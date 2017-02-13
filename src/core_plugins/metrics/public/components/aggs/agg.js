import React, { PropTypes } from 'react';
import StdAgg from './std_agg';
import aggToComponent from '../lib/agg_to_component';
import { sortable } from 'react-anything-sortable';

function Agg(props) {
  const { model } = props;
  let Component = aggToComponent[model.type];
  if (!Component) {
    Component = StdAgg;
  }
  const style = Object.assign({ cursor: 'default' }, props.style);
  return (
    <div
      className={props.className}
      style={style}
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}>
      <Component
        fields={props.fields}
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onChange={props.onChange}
        onDelete={props.onDelete}
        panel={props.panel}
        series={props.series}
        siblings={props.siblings}/>
    </div>
  );

}

Agg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  onMouseDown: PropTypes.func,
  onSortableItemMount: PropTypes.func,
  onSortableItemReadyToMove: PropTypes.func,
  onTouchStart: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
  sortData: PropTypes.string,
};

export default sortable(Agg);
