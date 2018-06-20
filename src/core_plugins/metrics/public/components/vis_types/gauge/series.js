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
import React from 'react';
import ColorPicker from '../../color_picker';
import AddDeleteButtons from '../../add_delete_buttons';
import { SeriesConfig } from '../../series_config';
import Sortable from 'react-anything-sortable';
import Split from '../../split';
import { EuiToolTip } from '@elastic/eui';
import createAggRowRender from '../../lib/create_agg_row_render';
import createTextHandler from '../../lib/create_text_handler';
import { createUpDownHandler } from '../../lib/sort_keyhandler';

function GaugeSeries(props) {
  const {
    panel,
    fields,
    onAdd,
    onChange,
    onDelete,
    disableDelete,
    disableAdd,
    selectedTab,
    visible
  } = props;

  const defaults = { label: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createTextHandler(onChange);
  const aggs = model.metrics.map(createAggRowRender(props));

  let caretClassName = 'fa fa-caret-down';
  if (!visible) caretClassName = 'fa fa-caret-right';

  let body = null;
  if (visible) {
    let metricsClassName = 'kbnTabs__tab';
    let optionsClassname = 'kbnTabs__tab';
    if (selectedTab === 'metrics') metricsClassName += '-active';
    if (selectedTab === 'options') optionsClassname += '-active';
    let seriesBody;
    if (selectedTab === 'metrics') {
      const handleSort = (data) => {
        const metrics = data.map(id => model.metrics.find(m => m.id === id));
        props.onChange({ metrics });
      };
      seriesBody = (
        <div>
          <Sortable
            style={{ cursor: 'default' }}
            dynamic={true}
            direction="vertical"
            onSort={handleSort}
            sortHandle="vis_editor__agg_sort"
          >
            { aggs }
          </Sortable>
          <div className="vis_editor__series_row">
            <div className="vis_editor__series_row-item">
              <Split
                onChange={props.onChange}
                fields={fields}
                panel={panel}
                model={model}
              />
            </div>
          </div>
        </div>
      );
    } else {
      seriesBody = (
        <SeriesConfig
          fields={props.fields}
          model={props.model}
          onChange={props.onChange}
        />
      );
    }
    body = (
      <div className="vis_editor__series-row">
        <div className="kbnTabs sm" role="tablist">
          <button
            role="tab"
            aria-selected={selectedTab === 'metrics'}
            className={metricsClassName}
            onClick={() => props.switchTab('metrics')}
          >Metrics
          </button>
          <button
            role="tab"
            data-test-subj="seriesOptions"
            aria-selected={selectedTab === 'options'}
            className={optionsClassname}
            onClick={() => props.switchTab('options')}
          >Options
          </button>
        </div>
        {seriesBody}
      </div>
    );
  }

  const colorPicker = (
    <ColorPicker
      disableTrash={true}
      onChange={props.onChange}
      name="color"
      value={model.color}
    />
  );

  let dragHandle;
  if (!props.disableDelete) {
    dragHandle = (
      <EuiToolTip content="Sort">
        <button
          className="vis_editor__sort thor__button-outlined-default sm"
          aria-label="Sort series by pressing up/down"
          onKeyDown={createUpDownHandler(props.onShouldSortItem)}
        >
          <i className="fa fa-sort" />
        </button>
      </EuiToolTip>
    );
  }

  return (
    <div
      className={`${props.className} vis_editor__series`}
      style={props.style}
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
    >
      <div className="vis_editor__container">
        <div className="vis_editor__series-details">
          <button
            className="vis_editor__series-visibility-toggle"
            onClick={props.toggleVisible}
            aria-label="Toggle series editor"
            aria-expanded={props.visible}
          >
            <i className={caretClassName}/>
          </button>
          { colorPicker }
          <div className="vis_editor__row vis_editor__row_item">
            <input
              className="vis_editor__input-grows"
              onChange={handleChange('label')}
              placeholder="Label"
              value={model.label}
            />
          </div>
          { dragHandle }
          <AddDeleteButtons
            addTooltip="Add Series"
            deleteTooltip="Delete Series"
            cloneTooltip="Clone Series"
            onDelete={onDelete}
            onClone={props.onClone}
            onAdd={onAdd}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
          />
        </div>
      </div>
      { body }
    </div>
  );

}

GaugeSeries.propTypes = {
  className: PropTypes.string,
  colorPicker: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  name: PropTypes.string,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onClone: PropTypes.func,
  onDelete: PropTypes.func,
  onMouseDown: PropTypes.func,
  onSortableItemMount: PropTypes.func,
  onSortableItemReadyToMove: PropTypes.func,
  onTouchStart: PropTypes.func,
  model: PropTypes.object,
  panel: PropTypes.object,
  selectedTab: PropTypes.string,
  sortData: PropTypes.string,
  style: PropTypes.object,
  switchTab: PropTypes.func,
  toggleVisible: PropTypes.func,
  visible: PropTypes.bool
};

export default GaugeSeries;
