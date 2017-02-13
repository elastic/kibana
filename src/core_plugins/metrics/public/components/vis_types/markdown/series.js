import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import ColorPicker from '../../color_picker';
import AddDeleteButtons from '../../add_delete_buttons';
import SeriesConfig from '../../series_config';
import Sortable from 'react-anything-sortable';
import Tooltip from '../../tooltip';
import Split from '../../split';
import calculateLabel from '../../lib/calculate_label';
import createAggRowRender from '../../lib/create_agg_row_render';

class MarkdownSeries extends Component {

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
        this.props.onChange(part);
      };
    };

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
        seriesBody = (
          <SeriesConfig
            fields={this.props.fields}
            model={this.props.model}
            onChange={this.props.onChange} />
        );
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
        <div className="vis_editor__container">
          <div className="vis_editor__series-details">
            <div onClick={ this.props.toggleVisible }><i className={ caretClassName }/></div>
            <div className="vis_editor__row_item" style={{ display: 'flex' }}>
              <input
                className="vis_editor__input-grows"
                style={{ marginRight: 10 }}
                onChange={handleFieldChange('label')}
                placeholder='Label'
                ref="label"
                defaultValue={model.label}/>
              <input
                className="vis_editor__input-grows"
                onChange={handleFieldChange('var_name')}
                placeholder='Variable Name'
                ref="var_name"
                defaultValue={model.var_name}/>
            </div>
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

}

MarkdownSeries.propTypes = {
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

export default MarkdownSeries;
