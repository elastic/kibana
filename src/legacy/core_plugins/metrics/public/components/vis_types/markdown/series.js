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
import AddDeleteButtons from '../../add_delete_buttons';
import { SeriesConfig } from '../../series_config';
import Split from '../../split';
import createTextHandler from '../../lib/create_text_handler';
import { EuiTabs, EuiTab, EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButtonIcon } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { Aggs } from '../../aggs/aggs';
import { SeriesDragHandler } from '../../series_drag_handler';

function MarkdownSeriesUi(props) {
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
    intl,
    name,
    uiRestrictions
  } = props;

  const defaults = { label: '', var_name: '' };
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
              id="tsvb.markdown.dataTab.metricsButtonLabel"
              defaultMessage="Metrics"
            />
          </EuiTab>
          <EuiTab
            data-test-subj="seriesOptions"
            isSelected={selectedTab === 'options'}
            onClick={() => props.switchTab('options')}
          >
            <FormattedMessage
              id="tsvb.markdown.optionsTab.optionsButtonLabel"
              defaultMessage="Options"
            />
          </EuiTab>
        </EuiTabs>
        {seriesBody}
      </div>
    );
  }

  return (
    <div
      className={`${props.className}`}
      style={props.style}
    >
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={caretIcon}
            color="text"
            onClick={props.toggleVisible}
            aria-label={intl.formatMessage({ id: 'tsvb.markdown.editor.toggleEditorAriaLabel', defaultMessage: 'Toggle series editor' })}
            aria-expanded={props.visible}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            onChange={handleChange('label')}
            placeholder={intl.formatMessage({ id: 'tsvb.markdown.editor.labelPlaceholder', defaultMessage: 'Label' })}
            value={model.label}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            onChange={handleChange('var_name')}
            placeholder={intl.formatMessage({ id: 'tsvb.markdown.editor.variableNamePlaceholder', defaultMessage: 'Variable name' })}
            value={model.var_name}
          />
        </EuiFlexItem>

        <SeriesDragHandler dragHandleProps={props.dragHandleProps} hideDragHandler={true} />

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            addTooltip={intl.formatMessage({ id: 'tsvb.markdown.editor.addSeriesTooltip', defaultMessage: 'Add series' })}
            deleteTooltip={intl.formatMessage({ id: 'tsvb.markdown.editor.deleteSeriesTooltip', defaultMessage: 'Delete series' })}
            cloneTooltip={intl.formatMessage({ id: 'tsvb.markdown.editor.cloneSeriesTooltip', defaultMessage: 'Clone series' })}
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

MarkdownSeriesUi.propTypes = {
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
  uiRestrictions: PropTypes.object,
  dragHandleProps: PropTypes.object,
};

const MarkdownSeries = injectI18n(MarkdownSeriesUi);
export default MarkdownSeries;
