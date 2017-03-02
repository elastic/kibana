import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import ColorPicker from '../../color_picker';
import AddDeleteButtons from '../../add_delete_buttons';
import SeriesConfig from '../../series_config';
import Sortable from 'react-anything-sortable';
import Tooltip from '../../tooltip';
import MetricSelect from '../../aggs/metric_select';
import Split from '../../split';
import { handleChange } from '../../lib/collection_actions';
import createAggRowRender from '../../lib/create_agg_row_render';

function TopNSeries(props) {
  const {
    panel,
    model,
    fields,
    onAdd,
    onDelete,
    disableDelete,
    disableAdd,
    selectedTab,
    visible,
  } = props;

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
            sortHandle="vis_editor__agg_sort">
            { aggs }
          </Sortable>
          <div className="vis_editor__series_row">
            <div className="vis_editor__series_row-item">
              <Split
                onChange={props.onChange}
                fields={fields}
                panel={panel}
                model={model}/>
            </div>
          </div>
        </div>
      );
    } else {
      seriesBody = (
        <SeriesConfig
          fields={props.fields}
          model={props.model}
          onChange={props.onChange} />
      );
    }
    body = (
      <div className="vis_editor__series-row">
        <div className="kbnTabs sm">
          <div className={metricsClassName}
            onClick={e => props.switchTab('metrics')}>Metrics</div>
          <div className={optionsClassname}
            onClick={e => props.switchTab('options')}>Options</div>
        </div>
        {seriesBody}
      </div>
    );
  }

  return (
    <div
      className={`${props.className} vis_editor__series`}
      style={props.style}
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}>
      { body }
    </div>
  );

}

TopNSeries.propTypes = {
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

export default TopNSeries;
