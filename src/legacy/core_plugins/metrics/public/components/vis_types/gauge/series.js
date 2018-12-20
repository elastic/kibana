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
import { EuiToolTip, EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButtonIcon } from '@elastic/eui';
import createAggRowRender from '../../lib/create_agg_row_render';
import createTextHandler from '../../lib/create_text_handler';
import { createUpDownHandler } from '../../lib/sort_keyhandler';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

function GaugeSeriesUi(props) {
  const {
    panel,
    fields,
    onAdd,
    onChange,
    onDelete,
    disableDelete,
    disableAdd,
    selectedTab,
    visible,
    intl
  } = props;

  const defaults = { label: '' };
  const model = { ...defaults, ...props.model };

  const handleChange = createTextHandler(onChange);
  const aggs = model.metrics.map(createAggRowRender(props));

  let caretIcon = 'arrowDown';
  if (!visible) caretIcon = 'arrowRight';

  let body = null;
  if (visible) {
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
            sortHandle="tvbAggRow__sortHandle"
          >
            { aggs }
          </Sortable>
          <div className="tvbAggRow tvbAggRow--split">
            <Split
              onChange={props.onChange}
              fields={fields}
              panel={panel}
              model={model}
            />
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
      <div className="tvbSeries__body">
        <EuiTabs size="s">
          <EuiTab
            isSelected={selectedTab === 'metrics'}
            onClick={() => props.switchTab('metrics')}
          >
            <FormattedMessage
              id="tsvb.gauge.dataTab.metricsButtonLabel"
              defaultMessage="Metrics"
            />
          </EuiTab>
          <EuiTab
            data-test-subj="seriesOptions"
            isSelected={selectedTab === 'options'}
            onClick={() => props.switchTab('options')}
          >
            <FormattedMessage
              id="tsvb.gauge.optionsTab.optionsButtonLabel"
              defaultMessage="Options"
            />
          </EuiTab>
        </EuiTabs>
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
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={(<FormattedMessage
            id="tsvb.gauge.sort.dragToSortTooltip"
            defaultMessage="Drag to sort"
          />)}
        >
          <EuiButtonIcon
            className="tvbSeries__sortHandle"
            iconType="grab"
            aria-label={intl.formatMessage({ id: 'tsvb.gauge.sort.sortAriaLabel', defaultMessage: 'Sort series by pressing up/down' })}
            onKeyDown={createUpDownHandler(props.onShouldSortItem)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  return (
    <div
      className={`${props.className}`}
      style={props.style}
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
    >

      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={caretIcon}
            color="text"
            onClick={props.toggleVisible}
            aria-label={intl.formatMessage({ id: 'tsvb.gauge.editor.toggleEditorAriaLabel', defaultMessage: 'Toggle series editor' })}
            aria-expanded={props.visible}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          { colorPicker }
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            onChange={handleChange('label')}
            placeholder={intl.formatMessage({ id: 'tsvb.gauge.editor.labelPlaceholder', defaultMessage: 'Label' })}
            value={model.label}
          />
        </EuiFlexItem>

        { dragHandle }

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            addTooltip={intl.formatMessage({ id: 'tsvb.gauge.editor.addSeriesTooltip', defaultMessage: 'Add Series' })}
            deleteTooltip={intl.formatMessage({ id: 'tsvb.gauge.editor.deleteSeriesTooltip', defaultMessage: 'Delete Series' })}
            cloneTooltip={intl.formatMessage({ id: 'tsvb.gauge.editor.cloneSeriesTooltip', defaultMessage: 'Clone Series' })}
            onDelete={onDelete}
            onClone={props.onClone}
            onAdd={onAdd}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      { body }
    </div>
  );

}

GaugeSeriesUi.propTypes = {
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

const GaugeSeries = injectI18n(GaugeSeriesUi);
export default GaugeSeries;
