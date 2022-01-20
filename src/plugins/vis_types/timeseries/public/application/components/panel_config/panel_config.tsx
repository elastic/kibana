/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { TimeseriesVisData } from '../../../../common/types';
import { FormValidationContext } from '../../contexts/form_validation_context';
import { VisDataContext } from '../../contexts/vis_data_context';
import { PanelModelContext } from '../../contexts/panel_model_context';
import { PanelConfigProps } from './types';
import { TimeseriesPanelConfig as timeseries } from './timeseries';
import { MetricPanelConfig as metric } from './metric';
import { TopNPanelConfig as topN } from './top_n';
import { TablePanelConfig as table } from './table';
import { GaugePanelConfig as gauge } from './gauge';
import { MarkdownPanelConfig as markdown } from './markdown';

const panelConfigTypes = {
  timeseries,
  table,
  metric,
  top_n: topN,
  gauge,
  markdown,
};

interface FormValidationResults {
  [key: string]: boolean;
}

const checkModelValidity = (validationResults: FormValidationResults) =>
  Object.values(validationResults).every((isValid) => isValid);

export function PanelConfig(props: PanelConfigProps) {
  const { model, onChange } = props;
  const Component = panelConfigTypes[model.type];
  const formValidationResults = useRef<FormValidationResults>({});
  const [visData, setVisData] = useState<TimeseriesVisData>({} as TimeseriesVisData);

  useEffect(() => {
    const visDataSubscription = props.visData$.subscribe((data = {} as TimeseriesVisData) =>
      setVisData(data)
    );

    return () => visDataSubscription.unsubscribe();
  }, [model.id, props.visData$]);

  const updateControlValidity = useCallback(
    (controlKey: string, isControlValid: boolean) => {
      formValidationResults.current[controlKey] = isControlValid;
      onChange({ isModelInvalid: !checkModelValidity(formValidationResults.current) });
    },
    [onChange]
  );

  if (Component) {
    return (
      <FormValidationContext.Provider value={updateControlValidity}>
        <PanelModelContext.Provider value={model}>
          <VisDataContext.Provider value={visData}>
            <div data-test-subj={`tvbPanelConfig__${model.type}`}>
              <Component {...props} />
            </div>
          </VisDataContext.Provider>
        </PanelModelContext.Provider>
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
