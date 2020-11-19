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
import { find } from 'lodash';
import { reIdSeries } from './lib/re_id_series';
import { Series } from './series';
import { handleAdd, handleDelete, handleChange } from './lib/collection_actions';
import { newSeriesFn } from './lib/new_series_fn';
import { EuiDragDropContext, EuiDroppable, EuiDraggable } from '@elastic/eui';
import { reorder } from './lib/reorder';

const DROPPABLE_ID = 'series_editor_dnd';

export class SeriesEditor extends Component {
  handleClone = (series) => {
    const newSeries = reIdSeries(series);

    handleAdd.call(null, this.props, () => newSeries);
  };

  sortHandler = ({ destination, source }) => {
    const canSort = destination && source;

    if (canSort) {
      const sortFunction = this.getSortFunction({ destination, source });

      sortFunction({ destination, source });
    }
  };

  getSortFunction = ({ destination, source }) =>
    destination.droppableId === source.droppableId && source.droppableId === DROPPABLE_ID
      ? this.sortSeries
      : this.sortAggregations;

  sortSeries = ({ destination, source }) => {
    this.props.onChange({
      series: reorder([...this.props.model.series], source.index, destination.index),
    });
  };

  sortAggregations = ({ destination, source }) => {
    const extractId = ({ droppableId }) => droppableId.split(':')[1];
    const id = extractId(source);
    const canSort = id === extractId(destination);

    if (canSort) {
      const model = [...this.props.model.series];
      const series = find(model, { id });

      series.metrics = reorder([...series.metrics], source.index, destination.index);

      this.props.onChange({
        series: model,
      });
    }
  };

  render() {
    const { limit, model, name, fields, colorPicker } = this.props;
    const list = model[name].filter((val, index) => index < (limit || Infinity));

    return (
      <EuiDragDropContext onDragEnd={this.sortHandler}>
        <EuiDroppable droppableId={DROPPABLE_ID} spacing="l" type="MACRO">
          {list.map((row, idx) => (
            <EuiDraggable
              spacing="m"
              key={row.id}
              index={idx}
              customDragHandle={true}
              draggableId={`${DROPPABLE_ID}:${row.id}`}
              disableInteractiveElementBlocking
            >
              {(provided) => (
                <Series
                  className="tvbSeriesEditor"
                  colorPicker={colorPicker}
                  disableAdd={model[name].length >= limit}
                  disableDelete={model[name].length < 2}
                  fields={fields}
                  onAdd={() => handleAdd(this.props, newSeriesFn)}
                  onChange={(doc) => handleChange(this.props, doc)}
                  onClone={() => this.handleClone(row)}
                  onDelete={() => handleDelete(this.props, row)}
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
};
