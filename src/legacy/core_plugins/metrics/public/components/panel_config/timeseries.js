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
import React, { useState } from 'react';
import SeriesEditor from '../series_editor';
import AnnotationsEditor from '../annotations_editor';
import { IndexPattern } from '../index_pattern';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import ColorPicker from '../color_picker';
import YesNo from '../yes_no';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiTabs,
  EuiTab,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiHorizontalRule,
  EuiCheckbox,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const DEFAULTS = {
  filter: '',
  axis_max: '',
  axis_min: '',
  legend_position: 'right',
  show_grid: 1
};
const getUniqueId = htmlIdGenerator();

function TimeseriesPanelConfigUI({ model: seriesModel, onChange, intl, fields, name }) {
  const [tab, switchTab] = useState('data');
  const [isTimeMarkerChecked, toggleTimeMarker] = useState(false);

  const model = { ...DEFAULTS, ...seriesModel };
  const handleSelectChange = createSelectHandler(onChange);
  const handleTextChange = createTextHandler(onChange);

  const positionOptions = [
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.positionOptions.rightLabel', defaultMessage: 'Right' }),
      value: 'right'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.positionOptions.leftLabel', defaultMessage: 'Left' }),
      value: 'left'
    }
  ];
  const selectedPositionOption = positionOptions.find(option => {
    return model.axis_position === option.value;
  });
  const scaleOptions = [
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.scaleOptions.normalLabel', defaultMessage: 'Normal' }),
      value: 'normal'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.scaleOptions.logLabel', defaultMessage: 'Log' }),
      value: 'log' }
  ];
  const selectedAxisScaleOption = scaleOptions.find(option => {
    return model.axis_scale === option.value;
  });
  const legendPositionOptions = [
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.legendPositionOptions.rightLabel', defaultMessage: 'Right' }),
      value: 'right'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.legendPositionOptions.leftLabel', defaultMessage: 'Left' }),
      value: 'left'
    },
    {
      label: intl.formatMessage({ id: 'tsvb.timeseries.legendPositionOptions.bottomLabel', defaultMessage: 'Bottom' }),
      value: 'bottom'
    }
  ];
  const selectedLegendPosOption = legendPositionOptions.find(option => {
    return model.legend_position === option.value;
  });

  let view;
  if (tab === 'data') {
    view = (
      <SeriesEditor
        fields={fields}
        model={seriesModel}
        name={name}
        onChange={onChange}
      />
    );
  } else if (tab === 'annotations') {
    view = (
      <AnnotationsEditor
        fields={fields}
        model={seriesModel}
        name="annotations"
        onChange={onChange}
      />
    );
  } else {
    view = (
      <div className="tvbPanelConfig__container">
        <EuiPanel>
          <EuiTitle size="s">
            <span>
              <FormattedMessage
                id="tsvb.timeseries.optionsTab.dataLabel"
                defaultMessage="Data"
              />
            </span>
          </EuiTitle>
          <EuiSpacer size="m" />

          <IndexPattern
            fields={fields}
            model={seriesModel}
            onChange={onChange}
          />

          <EuiHorizontalRule />

          <EuiFlexGroup responsive={false} wrap={true}>
            <EuiFlexItem>
              <EuiFormRow
                id={getUniqueId('panelFilter')}
                label={(<FormattedMessage
                  id="tsvb.timeseries.optionsTab.panelFilterLabel"
                  defaultMessage="Panel filter"
                />)}
                fullWidth
              >
                <EuiFieldText
                  onChange={handleTextChange('filter')}
                  value={model.filter}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.ignoreGlobalFilterLabel"
                  defaultMessage="Ignore global filter?"
                />
              </EuiFormLabel>
              <EuiSpacer size="s" />
              <YesNo
                value={model.ignore_global_filter}
                name="ignore_global_filter"
                onChange={onChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer />

        <EuiPanel>
          <EuiTitle size="s">
            <span>
              <FormattedMessage
                id="tsvb.timeseries.optionsTab.styleLabel"
                defaultMessage="Style"
              />
            </span>
          </EuiTitle>
          <EuiSpacer size="m" />

          <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
            <EuiFlexItem>
              <EuiFormRow
                id={getUniqueId('axisMin')}
                label={(<FormattedMessage
                  id="tsvb.timeseries.optionsTab.axisMinLabel"
                  defaultMessage="Axis min"
                />)}
              >
                <EuiFieldText
                  onChange={handleTextChange('axis_min')}
                  value={model.axis_min}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={getUniqueId('axisMax')}
                label={(<FormattedMessage
                  id="tsvb.timeseries.optionsTab.axisMaxLabel"
                  defaultMessage="Axis max"
                />)}
              >
                <EuiFieldText
                  onChange={handleTextChange('axis_max')}
                  value={model.axis_max}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={getUniqueId('axisPos')}
                label={(<FormattedMessage
                  id="tsvb.timeseries.optionsTab.axisPositionLabel"
                  defaultMessage="Axis position"
                />)}
              >
                <EuiComboBox
                  isClearable={false}
                  options={positionOptions}
                  selectedOptions={selectedPositionOption ? [selectedPositionOption] : []}
                  onChange={handleSelectChange('axis_position')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id={getUniqueId('axisScale')}
                label={(<FormattedMessage
                  id="tsvb.timeseries.optionsTab.axisScaleLabel"
                  defaultMessage="Axis scale"
                />)}
              >
                <EuiComboBox
                  isClearable={false}
                  options={scaleOptions}
                  selectedOptions={selectedAxisScaleOption ? [selectedAxisScaleOption] : []}
                  onChange={handleSelectChange('axis_scale')}
                  singleSelection={{ asPlainText: true }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule />

          <EuiFlexGroup responsive={false} wrap={true} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFormLabel style={{ marginBottom: 0 }}>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.backgroundColorLabel"
                  defaultMessage="Background color:"
                />
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexItem>
              <ColorPicker
                onChange={onChange}
                name="background_color"
                value={model.background_color}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormLabel style={{ marginBottom: 0 }}>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.showLegendLabel"
                  defaultMessage="Show legend?"
                />
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexItem>
              <YesNo
                value={model.show_legend}
                name="show_legend"
                onChange={onChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormLabel style={{ marginBottom: 0 }} htmlFor={getUniqueId('legendPos')}>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.legendPositionLabel"
                  defaultMessage="Legend position"
                />
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiComboBox
                isClearable={false}
                id={getUniqueId('legendPos')}
                options={legendPositionOptions}
                selectedOptions={selectedLegendPosOption ? [selectedLegendPosOption] : []}
                onChange={handleSelectChange('legend_position')}
                singleSelection={{ asPlainText: true }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormLabel style={{ marginBottom: 0 }}>
                <FormattedMessage
                  id="tsvb.timeseries.optionsTab.displayGridLabel"
                  defaultMessage="Display grid"
                />
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexItem>
              <YesNo
                value={model.show_grid}
                name="show_grid"
                onChange={onChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCheckbox
                id={getUniqueId('timeMarker')}
                label="Current Time Marker"
                checked={isTimeMarkerChecked}
                onChange={() => toggleTimeMarker(!isTimeMarkerChecked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    );
  }

  return (
    <div>
      <EuiTabs size="s">
        <EuiTab
          isSelected={tab === 'data'}
          onClick={() => switchTab('data')}
        >
          <FormattedMessage
            id="tsvb.timeseries.dataTab.dataButtonLabel"
            defaultMessage="Data"
          />
        </EuiTab>
        <EuiTab
          isSelected={tab === 'options'}
          onClick={() => switchTab('options')}
        >
          <FormattedMessage
            id="tsvb.timeseries.optionsTab.panelOptionsButtonLabel"
            defaultMessage="Panel options"
          />
        </EuiTab>
        <EuiTab
          isSelected={tab === 'annotations'}
          onClick={() => switchTab('annotations')}
        >
          <FormattedMessage
            id="tsvb.timeseries.annotationsTab.annotationsButtonLabel"
            defaultMessage="Annotations"
          />
        </EuiTab>
      </EuiTabs>
      {view}
    </div>
  );
}

TimeseriesPanelConfigUI.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export const TimeseriesPanelConfig = injectI18n(TimeseriesPanelConfigUI);
