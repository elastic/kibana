/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

const checkModelValidity = (validationResults) =>
  Boolean(Object.values(validationResults).every((isValid) => isValid));

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
          <div data-test-subj={`tvbPanelConfig__${model.type}`}>
            <Component {...props} />
          </div>
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
  visData$: PropTypes.object,
  getConfig: PropTypes.func,
};
