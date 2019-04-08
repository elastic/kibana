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
import { PanelOptionEditor } from '../panel_options_editor';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

function TimeseriesPanelConfigUI({ model, onChange, intl, fields, name }) {
  const [tab, switchTab] = useState('data');
  let view;

  switch (tab) {
    case 'data':
      view = (
        <SeriesEditor
          fields={fields}
          model={model}
          name={name}
          onChange={onChange}
        />
      );
      break;
    case 'annotations':
      view = (
        <AnnotationsEditor
          fields={fields}
          model={model}
          name="annotations"
          onChange={onChange}
        />
      );
      break;
    default:
      view = (
        <PanelOptionEditor
          fields={fields}
          model={model}
          onChange={onChange}
          intl={intl}
        />
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
  name: PropTypes.string,
  intl: PropTypes.object,
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export const TimeseriesPanelConfig = injectI18n(TimeseriesPanelConfigUI);
