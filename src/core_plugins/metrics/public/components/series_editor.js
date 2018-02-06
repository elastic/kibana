import PropTypes from 'prop-types';
import React, { Component } from 'react';
import reIdSeries from './lib/re_id_series';
import Series from './series';
import {
  handleAdd,
  handleDelete,
  handleChange
} from './lib/collection_actions';
import newSeriesFn from './lib/new_series_fn';
import Sortable from 'react-anything-sortable';

class SeriesEditor extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
    this.sortSeries = this.sortSeries.bind(this);
  }

  handleClone(series) {
    const newSeries = reIdSeries(series);
    handleAdd.call(null, this.props, () => newSeries);
  }

  sortSeries(index, direction, allSeries) {
    const newIndex = index + (direction === 'up' ? -1 : 1);
    if (newIndex < 0 || newIndex >= allSeries.length) {
      // Don't do anything when series is already at the edge
      return;
    }

    const newSeries = allSeries.slice(0);
    const changeWithElement = allSeries[newIndex];
    newSeries[newIndex] = allSeries[index];
    newSeries[index] = changeWithElement;
    this.props.onChange({ series: newSeries });
  }

  renderRow(row, index, allSeries) {
    const { props } = this;
    const { fields, model, name, limit, colorPicker } = props;
    return (
      <Series
        colorPicker={colorPicker}
        disableAdd={model[name].length >= limit}
        disableDelete={model[name].length < 2}
        fields={fields}
        key={row.id}
        onAdd={handleAdd.bind(null, props, newSeriesFn)}
        onChange={handleChange.bind(null, props)}
        onClone={() => this.handleClone(row)}
        onDelete={handleDelete.bind(null, props, row)}
        onShouldSortItem={(direction) => this.sortSeries(index, direction, allSeries)}
        model={row}
        panel={model}
        sortData={row.id}
      />
    );
  }

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
          sortHandle="vis_editor__sort"
        >
          { series }
        </Sortable>
      </div>
    );
  }

}
SeriesEditor.defaultProps = {
  name: 'series',
  limit: Infinity,
  colorPicker: true
};

SeriesEditor.propTypes = {
  colorPicker: PropTypes.bool,
  fields: PropTypes.object,
  limit: PropTypes.number,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func
};

export default SeriesEditor;
