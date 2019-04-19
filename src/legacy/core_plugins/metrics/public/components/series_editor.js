/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import reIdSeries from './lib/re_id_series';
import Series from './series';
import {
  handleAdd,
  handleDelete,
  handleChange,
} from './lib/collection_actions';
import newSeriesFn from './lib/new_series_fn';
import { EuiDragDropContext, EuiDroppable, EuiDraggable } from '@elastic/eui';

const DROPPABLE_ID = 'series_editor_dnd';

class SeriesEditor extends Component {

  handleClone = series => {
    const newSeries = reIdSeries(series);

    handleAdd.call(null, this.props, () => newSeries);
  };

  sortSeries = ({ destination, source }) => {
    const canSort = destination && source &&
      source.droppableId === DROPPABLE_ID && destination.droppableId === DROPPABLE_ID &&
      source.index !== destination.index;

    if (canSort) {
      const series = [...this.props.model.series];
      const changeWithElement = series[destination.index];

      series[destination.index] = series[source.index];
      series[source.index] = changeWithElement;

      this.props.onChange({ series });
    }
  };

  render() {
    const { limit, model, name, fields, colorPicker } = this.props;
    const list = model[name]
      .filter((val, index) => index < (limit || Infinity));

    return (
      <EuiDragDropContext onDragEnd={this.sortSeries}>
        <EuiDroppable
          droppableId={DROPPABLE_ID}
          spacing="l"
        >
          {list.map((row, idx) => (
            <EuiDraggable
              spacing="m"
              key={row.id}
              index={idx}
              customDragHandle={true}
              draggableId={row.id}
            >
              {provided => (
                <Series
                  className="tvbSeriesEditor"
                  colorPicker={colorPicker}
                  disableAdd={model[name].length >= limit}
                  disableDelete={model[name].length < 2}
                  fields={fields}
                  onAdd={handleAdd.bind(null, this.props, newSeriesFn)}
                  onChange={handleChange.bind(null, this.props)}
                  onClone={() => this.handleClone(row)}
                  onDelete={handleDelete.bind(null, this.props, row)}
                  visData$={this.props.visData$}
                  model={row}
                  panel={model}
                  dragHandleProps={provided.dragHandleProps}
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }
}

SeriesEditor.defaultProps = {
  name: 'series',
  limit: Infinity,
  colorPicker: true,
};

SeriesEditor.propTypes = {
  colorPicker: PropTypes.bool,
  fields: PropTypes.object,
  limit: PropTypes.number,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func,
  visData$: PropTypes.object,
};

export default SeriesEditor;
