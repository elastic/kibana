import PropTypes from 'prop-types';
import React from 'react';
import AggRow from './agg_row';
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import Select from 'react-select';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import createNumberHandler from '../lib/create_number_handler';
import { htmlIdGenerator } from '@elastic/eui';

export const MovingAverageAgg = props => {
  const { siblings } = props;
  const defaults = {
    settings: '',
    minimize: 0,
    window: '',
    model: 'simple'
  };
  const model = { ...defaults, ...props.model };
  const handleChange = createChangeHandler(props.onChange, model);
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
  const htmlId = htmlIdGenerator();
  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__row_item">
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">Aggregation</div>
            <AggSelect
              panelType={props.panel.type}
              siblings={props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
          </div>
          <div className="vis_editor__row_item">
            <div className="vis_editor__label">Metric</div>
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              value={model.field}
            />
          </div>
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('model')}>Model</label>
            <Select
              inputProps={{ id: htmlId('model') }}
              clearable={false}
              placeholder="Select..."
              onChange={handleSelectChange('model')}
              value={props.model.model}
              options={modelOptions}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('windowSize')}>
              Window Size
            </label>
            <input
              id={htmlId('windowSize')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleNumberChange('window')}
              value={model.window}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('minimize')}>Minimize</label>
            <Select
              inputProps={{ id: htmlId('minimize') }}
              placeholder="Select..."
              onChange={handleSelectChange('minimize')}
              value={model.minimize}
              options={minimizeOptions}
            />
          </div>
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('windowSize')}>
              Predict
            </label>
            <input
              id={htmlId('predict')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleNumberChange('predict')}
              value={model.predict}
            />
          </div>
        </div>
        <div className="vis_editor__agg_row-item">
          <div className="vis_editor__row_item">
            <label className="vis_editor__label" htmlFor={htmlId('settings')}>
              Settings (<code>Key=Value</code> space-delimited)
            </label>
            <input
              id={htmlId('settings')}
              className="vis_editor__input-grows-100"
              type="text"
              onChange={handleTextChange('settings')}
              value={model.settings}
            />
          </div>
        </div>
      </div>
    </AggRow>
  );
};

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
