import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import ColorPicker from '../../color_picker';
import AddDeleteButtons from '../../add_delete_buttons';
import SeriesConfig from './config';
import Sortable from 'react-anything-sortable';
import Tooltip from '../../tooltip';
import MetricSelect from '../../aggs/metric_select';
import Split from '../../split';
import { handleChange } from '../../lib/collection_actions';
import createAggRowRender from '../../lib/create_agg_row_render';

class TopNSeries extends Component {

  render() {
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
    } = this.props;

    const aggs = model.metrics.map(createAggRowRender(this.props));

    let caretClassName = 'fa fa-caret-down';
    if (!visible) caretClassName = 'fa fa-caret-right';

    let body = (<div style={{ display: 'none' }}/>);
    if (visible) {
      let metricsClassName = 'kbnTabs__tab';
      let optionsClassname = 'kbnTabs__tab';
      if (selectedTab === 'metrics') metricsClassName += '-active';
      if (selectedTab === 'options') optionsClassname += '-active';
      let seriesBody;
      if (selectedTab === 'metrics') {
        const handleSort = (data) => {
          const metrics = data.map(id => model.metrics.find(m => m.id === id));
          this.props.onChange({ metrics });
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
            <div className="vis_editor__agg_row">
              <div className="vis_editor__agg_row-item">
                <Split
                  onChange={this.props.onChange}
                  fields={fields}
                  panel={panel}
                  model={model}/>
              </div>
            </div>
          </div>
        );
      } else {
        seriesBody = (<SeriesConfig {...this.props}
          onChange={this.props.onChange}/>);
      }
      body = (
        <div className="vis_editor__series-row">
          <div className="kbnTabs sm">
            <div className={metricsClassName}
              onClick={e => this.props.switchTab('metrics')}>Metrics</div>
            <div className={optionsClassname}
              onClick={e => this.props.switchTab('options')}>Options</div>
          </div>
          {seriesBody}
        </div>
      );
    }

    return (
      <div
        className={`${this.props.className} vis_editor__series`}
        style={this.props.style}
        onMouseDown={this.props.onMouseDown}
        onTouchStart={this.props.onTouchStart}>
        { body }
      </div>
    );
  }

}

TopNSeries.propTypes = {
  className                 : PropTypes.string,
  colorPicker               : PropTypes.bool,
  disableAdd                : PropTypes.bool,
  disableDelete             : PropTypes.bool,
  fields                    : PropTypes.object,
  name                      : PropTypes.string,
  onAdd                     : PropTypes.func,
  onChange                  : PropTypes.func,
  onClone                   : PropTypes.func,
  onDelete                  : PropTypes.func,
  onMouseDown               : PropTypes.func,
  onSortableItemMount       : PropTypes.func,
  onSortableItemReadyToMove : PropTypes.func,
  onTouchStart              : PropTypes.func,
  model                     : PropTypes.object,
  panel                     : PropTypes.object,
  selectedTab               : PropTypes.string,
  sortData                  : PropTypes.string,
  style                     : PropTypes.object,
  switchTab                 : PropTypes.func,
  toggleVisible             : PropTypes.func,
  visible                   : PropTypes.bool
};

export default TopNSeries;
