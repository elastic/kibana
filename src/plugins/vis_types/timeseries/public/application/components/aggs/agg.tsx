/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, HTMLAttributes } from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-ignore
import { aggToComponent } from '../lib/agg_to_component';
import { isMetricEnabled } from '../../../../common/check_ui_restrictions';
import { getInvalidAggComponent } from './invalid_agg';
// @ts-expect-error not typed yet
import { seriesChangeHandler } from '../lib/series_change_handler';
import { checkIfNumericMetric } from '../lib/check_if_numeric_metric';
import { getFormatterType } from '../lib/get_formatter_type';
import { DATA_FORMATTERS } from '../../../../common/enums';
import type { Metric, Panel, Series, SanitizedFieldType } from '../../../../common/types';
import type { DragHandleProps } from '../../../types';
import type { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

interface AggProps extends HTMLAttributes<HTMLElement> {
  disableDelete: boolean;
  fields: Record<string, SanitizedFieldType[]>;
  name: string;
  model: Metric;
  panel: Panel;
  series: Series;
  siblings: Metric[];
  uiRestrictions: TimeseriesUIRestrictions;
  dragHandleProps: DragHandleProps;
  onModelChange: (part: Partial<Series>) => void;
  onAdd: () => void;
  onDelete: () => void;
}

export function Agg(props: AggProps) {
  const { model, uiRestrictions, series, name, onModelChange, fields, siblings } = props;

  let Component = aggToComponent[model.type];

  if (!Component) {
    Component = getInvalidAggComponent(
      <FormattedMessage
        id="visTypeTimeseries.agg.aggIsNotSupportedDescription"
        defaultMessage="The {modelType} aggregation is no longer supported."
        values={{ modelType: <EuiCode>{props.model.type}</EuiCode> }}
      />
    );
  } else if (!isMetricEnabled(model.type, uiRestrictions)) {
    Component = getInvalidAggComponent(
      <FormattedMessage
        id="visTypeTimeseries.agg.aggIsUnsupportedForPanelConfigDescription"
        defaultMessage="The {modelType} aggregation is not supported for existing panel configuration."
        values={{ modelType: <EuiCode>{props.model.type}</EuiCode> }}
      />
    );
  }

  const style = {
    cursor: 'default',
    ...props.style,
  };

  const indexPattern = props.series.override_index_pattern
    ? props.series.series_index_pattern
    : props.panel.index_pattern;
  const isKibanaIndexPattern = props.panel.use_kibana_indexes || indexPattern === '';

  const onAggChange = useMemo(
    () => seriesChangeHandler({ name, model: series, onChange: onModelChange }, siblings),
    [name, onModelChange, siblings, series]
  );

  useEffect(() => {
    // formatter is based on the last agg, i.e. active or resulting one as pipeline
    if (siblings[siblings.length - 1]?.id === model.id) {
      const formatterType = getFormatterType(series.formatter);
      const isNumericMetric = checkIfNumericMetric(model, fields, indexPattern);
      const isNumberFormatter = ![DATA_FORMATTERS.DEFAULT, DATA_FORMATTERS.CUSTOM].includes(
        formatterType
      );

      if (isNumberFormatter && !isNumericMetric) {
        onModelChange({ formatter: DATA_FORMATTERS.DEFAULT });
      }
      // in case of string index pattern mode, change default formatter depending on metric type
      // "number" formatter for numeric metric and "" as custom formatter for any other type
      if (formatterType === DATA_FORMATTERS.DEFAULT && !isKibanaIndexPattern) {
        onModelChange({
          formatter: isNumericMetric ? DATA_FORMATTERS.NUMBER : '',
        });
      }
    }
  }, [
    indexPattern,
    model,
    onModelChange,
    fields,
    series.formatter,
    isKibanaIndexPattern,
    siblings,
  ]);

  return (
    <div className={props.className} style={style}>
      <Component
        fields={props.fields}
        disableDelete={props.disableDelete}
        model={props.model}
        onAdd={props.onAdd}
        onChange={onAggChange}
        onDelete={props.onDelete}
        panel={props.panel}
        series={props.series}
        siblings={props.siblings}
        indexPattern={indexPattern}
        uiRestrictions={props.uiRestrictions}
        dragHandleProps={props.dragHandleProps}
      />
    </div>
  );
}
