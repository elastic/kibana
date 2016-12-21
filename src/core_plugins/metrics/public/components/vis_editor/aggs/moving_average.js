import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../../../lib/create_select_handler';
import createTextHandler from '../../../lib/create_text_handler';
import createNumberHandler from '../../../lib/create_number_handler';
export default React.createClass({
  render() {
    const { model, panelType, siblings } = this.props;
    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const handleTextChange = createTextHandler(handleChange, this.refs);
    const handleNumberChange = createNumberHandler(handleChange, this.refs);
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
      <AggRow {...this.props}>
        <div className="vis_editor__row_item">
          <div className="vis_editor__agg_row-item" style={{marginBottom: 10}}>
            <div className="vis_editor__row_item">
              <div className="vis_editor__label">Aggregation</div>
              <AggSelect
                siblings={this.props.siblings}
                panelType={panelType}
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
          <div className="vis_editor__agg_row-item" style={{marginBottom: 10}}>
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
                ref="window"
                onChange={handleNumberChange('window')}
                defaultValue={model.window}/>
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
                ref="script"
                onChange={handleTextChange('script')}
                defaultValue={model.script}/>
            </div>
          </div>
        </div>
      </AggRow>
    );
  }
});
