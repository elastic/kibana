import React, { Component, PropTypes } from 'react';
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
  }

  handleClone(series) {
    const newSeries = reIdSeries(series);
    handleAdd.call(null, this.props, () => newSeries);
  }

  renderRow(row) {
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
        model={row}
        panel={model}
        sortData={row.id} />
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
          sortHandle="vis_editor__sort">
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
