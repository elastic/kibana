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
import timeseries from './panel_config/timeseries';
import metric from './panel_config/metric';
import topN from './panel_config/top_n';
import table from './panel_config/table';
import gauge from './panel_config/gauge';
import markdown from './panel_config/markdown';
import { FormattedMessage } from '@kbn/i18n/react';

const types = {
  timeseries,
  table,
  metric,
  top_n: topN,
  gauge,
  markdown
};

function PanelConfig(props) {
  const { model } = props;
  const component = types[model.type];
  if (component) {
    return React.createElement(component, props);
  }
  return (
    <div>
      <FormattedMessage
        id="tsvb.missingPanelConfigDescription"
        defaultMessage="Missing panel config for &ldquo;{modelType}&rdquo;"
        values={{ modelType: model.type }}
      />
    </div>);
}

PanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  dateFormat: PropTypes.string,
  visData$: PropTypes.object,
};

export default PanelConfig;
