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
import React, { useState, useEffect } from 'react';
import { TimeseriesPanelConfig as timeseries } from './panel_config/timeseries';
import { MetricPanelConfig as metric } from './panel_config/metric';
import { TopNPanelConfig as topN } from './panel_config/top_n';
import { TablePanelConfig as table } from './panel_config/table';
import { GaugePanelConfig as gauge } from './panel_config/gauge';
import { MarkdownPanelConfig as markdown } from './panel_config/markdown';
import { FormattedMessage } from '@kbn/i18n/react';

import { FormValidationContext } from '../contexts/form_validation_context';
import { VisDataContext } from '../contexts/vis_data_context';

const types = {
  timeseries,
  table,
  metric,
  top_n: topN,
  gauge,
  markdown,
};

const checkModelValidity = validationResults =>
  Boolean(Object.values(validationResults).every(isValid => isValid));

export function PanelConfig(props) {
  const { model } = props;
  const Component = types[model.type];
  const [formValidationResults] = useState({});
  const [visData, setVisData] = useState({});

  useEffect(() => {
    model.isModelInvalid = !checkModelValidity(formValidationResults);
  });

  useEffect(() => {
    const visDataSubscription = props.visData$.subscribe((visData = {}) => setVisData(visData));

    return function cleanup() {
      visDataSubscription.unsubscribe();
    };
  }, [model.id, props.visData$]);

  const updateControlValidity = (controlKey, isControlValid) => {
    formValidationResults[controlKey] = isControlValid;
  };

  if (Component) {
    return (
      <FormValidationContext.Provider value={updateControlValidity}>
        <VisDataContext.Provider value={visData}>
          <Component {...props} />
        </VisDataContext.Provider>
      </FormValidationContext.Provider>
    );
  }

  return (
    <div>
      <FormattedMessage
        id="visTypeTimeseries.missingPanelConfigDescription"
        defaultMessage="Missing panel config for &ldquo;{modelType}&rdquo;"
        values={{ modelType: model.type }}
      />
    </div>
  );
}

PanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  dateFormat: PropTypes.string,
  visData$: PropTypes.object,
};
