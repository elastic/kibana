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
import { ColorPicker } from '../../color_picker';
import { AddDeleteButtons } from '../../add_delete_buttons';
import { Aggs } from '../../../components/aggs/aggs';
import { TimeseriesConfig as SeriesConfig } from './config';
import { SeriesDragHandler } from '../../series_drag_handler';
import {
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import { Split } from '../../split';
import { createTextHandler } from '../../lib/create_text_handler';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { PANEL_TYPES } from '../../../../common/panel_types';

const TimeseriesSeriesUI = injectI18n(function(props) {
  const {
    panel,
    fields,
    onAdd,
    onDelete,
    disableDelete,
    disableAdd,
    selectedTab,
    onChange,
    visible,
    intl,
    name,
    uiRestrictions,
    seriesQuantity,
  } = props;

  const defaults = {
    label: '',
    type: PANEL_TYPES.TIMESERIES,
  };
  const model = { ...defaults, ...props.model };

  const handleChange = createTextHandler(onChange);

  let caretIcon = 'arrowDown';
  if (!visible) caretIcon = 'arrowRight';

  let body = null;
  if (visible) {
    let seriesBody;

    if (selectedTab === 'metrics') {
      seriesBody = (
        <div>
          <Aggs
            onChange={props.onChange}
            fields={fields}
            panel={panel}
            model={model}
            name={name}
            uiRestrictions={uiRestrictions}
            dragHandleProps={props.dragHandleProps}
          />
          <div className="tvbAggRow tvbAggRow--split">
            <Split
              onChange={props.onChange}
              fields={fields}
              panel={panel}
              model={model}
              uiRestrictions={uiRestrictions}
              seriesQuantity={seriesQuantity}
            />
          </div>
        </div>
      );
    } else {
      seriesBody = (
        <SeriesConfig
          fields={props.fields}
          model={model}
          onChange={props.onChange}
          indexPatternForQuery={props.indexPatternForQuery}
          seriesQuantity={seriesQuantity}
        />
      );
    }
    body = (
      <div className="tvbSeries__body">
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'metrics'} onClick={() => props.switchTab('metrics')}>
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.tab.metricsLabel"
              defaultMessage="Metrics"
            />
          </EuiTab>
          <EuiTab
            data-test-subj="seriesOptions"
            isSelected={selectedTab === 'options'}
            onClick={() => props.switchTab('options')}
          >
            <FormattedMessage
              id="visTypeTimeseries.timeSeries.tab.optionsLabel"
              defaultMessage="Options"
            />
          </EuiTab>
        </EuiTabs>
        {seriesBody}
      </div>
    );
  }

  const colorPicker = (
    <ColorPicker disableTrash={true} onChange={props.onChange} name="color" value={model.color} />
  );

  return (
    <div className={`${props.className}`} style={props.style}>
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={caretIcon}
            color="text"
            onClick={props.toggleVisible}
            aria-label={intl.formatMessage({
              id: 'visTypeTimeseries.timeSeries.toggleSeriesEditorAriaLabel',
              defaultMessage: 'Toggle series editor',
            })}
            aria-expanded={props.visible}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{colorPicker}</EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            onChange={handleChange('label')}
            placeholder={intl.formatMessage({
              id: 'visTypeTimeseries.timeSeries.labelPlaceholder',
              defaultMessage: 'Label',
            })}
            value={model.label}
          />
        </EuiFlexItem>

        <SeriesDragHandler
          dragHandleProps={props.dragHandleProps}
          hideDragHandler={props.disableDelete}
        />

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            addTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.timeSeries.addSeriesTooltip',
              defaultMessage: 'Add Series',
            })}
            deleteTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.timeSeries.deleteSeriesTooltip',
              defaultMessage: 'Delete Series',
            })}
            cloneTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.timeSeries.cloneSeriesTooltip',
              defaultMessage: 'Clone Series',
            })}
            onDelete={onDelete}
            onClone={props.onClone}
            togglePanelActivation={props.togglePanelActivation}
            isPanelActive={!model.hidden}
            onAdd={onAdd}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {body}
    </div>
  );
});

TimeseriesSeriesUI.propTypes = {
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
  model: PropTypes.object,
  panel: PropTypes.object,
  selectedTab: PropTypes.string,
  style: PropTypes.object,
  switchTab: PropTypes.func,
  toggleVisible: PropTypes.func,
  visible: PropTypes.bool,
  togglePanelActivation: PropTypes.func,
  uiRestrictions: PropTypes.object,
  dragHandleProps: PropTypes.object,
  indexPatternForQuery: PropTypes.string,
  seriesQuantity: PropTypes.object,
};

export const TimeseriesSeries = injectI18n(TimeseriesSeriesUI);
