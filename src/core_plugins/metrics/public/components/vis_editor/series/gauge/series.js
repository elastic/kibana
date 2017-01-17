import React from 'react';
import _ from 'lodash';
import ColorPicker from 'plugins/metrics/components/vis_editor/color_picker';
import Agg from 'plugins/metrics/components/vis_editor/aggs/agg';
import newMetricAggFn from 'plugins/metrics/components/vis_editor/lib/new_metric_agg_fn';
import AddDeleteButtons from 'plugins/metrics/components/add_delete_buttons';
import SeriesConfig from './config';
import Sortable from 'react-anything-sortable';
import Split from 'plugins/metrics/components/vis_editor/split';
import Tooltip from 'plugins/metrics/components/tooltip';
import {
  handleAdd,
  handleDelete,
  handleChange
} from 'plugins/metrics/lib/collection_actions';

export default React.createClass({

  renderRow(row, index, items) {
    const { props } = this;
    const { panel, model, fields } = props;
    return (
      <Agg
        key={row.id}
        sortData={row.id}
        panel={panel}
        siblings={items}
        model={row}
        onAdd={handleAdd.bind(null, props, newMetricAggFn)}
        onDelete={handleDelete.bind(null, props, row)}
        onChange={handleChange.bind(null, props)}
        disableDelete={items.length < 2}
        fields={fields}/>
    );
  },

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
      visible
    } = this.props;

    const handleFieldChange = (name) => {
      return (e) => {
        e.preventDefault;
        const part = {};
        part[name] = this.refs[name].value;
        this.props.handleChange(part);
      };
    };

    const aggs = model.metrics.map(this.renderRow);

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
          this.props.handleChange({ metrics });
        };
        seriesBody = (
          <div>
            <Sortable
              dynamic={true}
              direction="vertical"
              onSort={handleSort}
              sortHandle="vis_editor__agg_sort">
              { aggs }
            </Sortable>
            <div className="vis_editor__agg_row">
              <div className="vis_editor__agg_row-item">
                <Split
                  onChange={this.props.handleChange}
                  fields={fields}
                  panel={panel}
                  model={model}/>
              </div>
            </div>
          </div>
        );
      } else {
        seriesBody = (<SeriesConfig {...this.props}
          onChange={this.props.handleChange}/>);
      }
      body = (
        <div className="vis_editor__series-row">
          <div className="kbnTabs sm">
            <div className={metricsClassName}
              onClick={e => this.props.switchTab('metrics')}>Metrics</div>
            <div className={optionsClassname}
              onClick={e => this.props.switchTab('options')}>Series Options</div>
          </div>
          {seriesBody}
        </div>
      );
    }

    let colorPicker;
    if (this.props.colorPicker) {
      colorPicker = (
        <ColorPicker
          disableTrash={true}
          onChange={this.props.handleChange}
          name="color"
          value={model.color}/>
      );
    }

    let dragHandle;
    if (!this.props.disableDelete) {
      dragHandle = (
        <Tooltip text="Sort">
          <div className="vis_editor__sort thor__button-outlined-default sm">
            <i className="fa fa-sort"></i>
        </div>
        </Tooltip>
      );
    }

    return (
      <div
        className={`${this.props.className} vis_editor__series`}
        style={this.props.style}
        onMouseDown={this.props.onMouseDown}
        onTouchStart={this.props.onTouchStart}>
        <div className="vis_editor__container">
          <div className="vis_editor__series-details">
            <div onClick={ this.props.toggleVisible }><i className={ caretClassName }/></div>
            { colorPicker }
            <div className="vis_editor__row_item" style={{ display: 'flex' }}>
              <input
                className="vis_editor__input-grows"
                onChange={handleFieldChange('label')}
                placeholder='Label'
                ref="label"
                defaultValue={model.label}/>
            </div>
            { dragHandle }
            <AddDeleteButtons
              onDelete={onDelete}
              onClone={this.props.onClone}
              onAdd={onAdd}
              disableDelete={disableDelete}
              disableAdd={disableAdd}/>
          </div>
        </div>
        { body }
      </div>
    );
  }
});


