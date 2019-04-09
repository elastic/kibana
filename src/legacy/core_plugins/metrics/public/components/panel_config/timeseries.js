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

const TABS = [
  {
    id: 'tsvb.timeseries.dataTab.dataButtonLabel',
    name: 'data',
    defaultMessage: 'Data',
  },
  {
    id: 'tsvb.timeseries.optionsTab.panelOptionsButtonLabel',
    name: 'options',
    defaultMessage: 'Panel options',
  },
  {
    id: 'tsvb.timeseries.annotationsTab.annotationsButtonLabel',
    name: 'annotations',
    defaultMessage: 'Annotations',
  },
];

function TimeseriesPanelConfigUI({ model, onChange, intl, fields, name }) {
  const [tab, switchTab] = useState(TABS[0].name);
  const [isTimeMarkerChecked, toggleTimeMarker] = useState(false);
  let view = null;

  switch (tab) {
    case TABS[0].name:
      view = (
        <SeriesEditor
          fields={fields}
          model={model}
          name={name}
          onChange={onChange}
        />
      );
      break;
    case TABS[1].name:
      view = (
        <PanelOptionEditor
          fields={fields}
          model={model}
          onChange={onChange}
          intl={intl}
          isTimeMarkerChecked={isTimeMarkerChecked}
          toggleTimeMarker={toggleTimeMarker}
        />
      );
      break;
    case TABS[2].name:
      view = (
        <AnnotationsEditor
          fields={fields}
          model={model}
          name="annotations"
          onChange={onChange}
        />
      );
      break;
  }

  return (
    <div>
      <EuiTabs size="s">
        {TABS.map(({ id, name, defaultMessage }) => (
          <EuiTab
            key={id}
            isSelected={tab === name}
            onClick={() => switchTab(name)}
          >
            <FormattedMessage
              id={id}
              defaultMessage={defaultMessage}
            />
          </EuiTab>
        ))}
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
