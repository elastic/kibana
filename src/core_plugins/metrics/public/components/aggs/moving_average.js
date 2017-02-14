import React, { Component, PropTypes } from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import createNumberHandler from '../lib/create_number_handler';

class MovingAverageAgg extends Component {
  render() {
    const { model, panel, siblings } = this.props;
    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange);
    const handleNumberChange = createNumberHandler(handleChange);
    const modelOptions = [
      { label: 'Simple', value: 'simple' },
      { label: 'Linear', value: 'linear' },
      { label: 'Exponentially Weighted', value: 'ewma' },
      { label: 'Holt-Linear', value: 'holt' },
      { label: 'Holt-Winters', value: 'holt_winters' }
    ];
    const minimizeOptions = [
      { label: 'True', value: 1 },
      { label: 'False', value: 0 }
    ];
    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}>
        <div className="vis_editor__row_item">
          <div className="vis_editor__agg_row-item" style={{ marginBottom: 10 }}>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Aggregation</div>
              <AggSelect
                siblings={this.props.siblings}
                panelType={panel.type}
                value={model.type}
                onChange={handleSelectChange('type')}/>
            </div>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Metric</div>
              <MetricSelect
                onChange={handleSelectChange('field')}
                metrics={siblings}
                metric={model}
                value={model.field}/>
            </div>
          </div>
          <div className="vis_editor__agg_row-item" style={{ marginBottom: 10 }}>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Model</div>
              <Select
                clearable={false}
                placeholder="Select..."
                onChange={ handleSelectChange('model') }
                value={this.props.model.model || 'simple'}
                options={ modelOptions }/>
            </div>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Window Size</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={handleNumberChange('window')}
                value={model.window || ''}/>
            </div>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Minimize</div>
              <Select
                placeholder="Select..."
                onChange={ handleSelectChange('minimize') }
                value={model.minimize || 0 }
                options={ minimizeOptions }/>
            </div>
          </div>
          <div className="vis_editor__agg_row-item">
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Settings (<code>Key=Value</code> space seperated)</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={handleTextChange('settings')}
                value={model.settings || ''}/>
            </div>
          </div>
        </div>
      </AggRow>
    );
  }

}

MovingAverageAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};

export default MovingAverageAgg;
