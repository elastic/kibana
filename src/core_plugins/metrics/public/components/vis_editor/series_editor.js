import React from 'react';
import reIdSeries from '../../lib/re_id_series';
import _ from 'lodash';
import Series from './series';
import uuid from 'node-uuid';
import {
  handleClone,
  handleAdd,
  handleDelete,
  handleChange
} from '../../lib/collection_actions';
import newSeriesFn from './lib/new_series_fn';
import Sortable from 'react-anything-sortable';


export default React.createClass({

  getInitialState() {
    return { draggingIndex: null };
  },

  getDefaultProps() {
    return {
      name: 'series',
      limit: Infinity,
      colorPicker: true
    };
  },

  updateState(obj) {
    this.setState({ draggingIndex: obj.draggingIndex });
    if (obj.items) {
      this.props.onChange({ series: obj.items });
    }
  },

  handleClone(series) {
    const newSeries = reIdSeries(series);
    handleAdd.call(null, this.props, () => newSeries);
  },

  renderRow(row, index) {
    const { props } = this;
    const { fields, model, name, limit, colorPicker } = props;
    return (
      <Series
        key={row.id}
        sortData={row.id}
        model={row}
        panel={model}
        onClone={() => this.handleClone(row)}
        onAdd={handleAdd.bind(null, props, newSeriesFn)}
        onDelete={handleDelete.bind(null, props, row)}
        onChange={handleChange.bind(null, props)}
        disableDelete={model[name].length < 2}
        disableAdd={model[name].length >= limit}
        colorPicker={colorPicker}
        fields={fields}/>
    );
  },


  render() {
    const { limit, model, name } = this.props;
    const series = model[name]
      .filter((val, index) => index < (limit || Infinity))
      .map(this.renderRow);
    const handleSort = (data) => {
      const series = data.map(id => model[name].find(s => s.id === id));
      this.props.onChange({ series });
    };
    return (
      <div className="vis_editor__series_editor-container">
        <Sortable
          dynamic={true}
          direction="vertical"
          onSort={handleSort}
          sortHandle="vis_editor__sort">
          { series }
        </Sortable>
      </div>
    );
  }
});
