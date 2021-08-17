/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, HTMLAttributes } from 'react';
// @ts-ignore
import { aggToComponent } from '../lib/agg_to_component';
// @ts-ignore
import { isMetricEnabled } from '../../lib/check_ui_restrictions';
// @ts-expect-error not typed yet
import { seriesChangeHandler } from '../lib/series_change_handler';
import { checkIfNumericMetric } from '../lib/check_if_numeric_metric';
import { UnsupportedAgg } from './unsupported_agg';
import { TemporaryUnsupportedAgg } from './temporary_unsupported_agg';
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
  onChange: (part: Partial<Series>) => void;
  onAdd: () => void;
  onDelete: () => void;
}

export function Agg(props: AggProps) {
  const { model, uiRestrictions, series, name, onChange, fields, siblings } = props;

  let Component = aggToComponent[model.type];

  if (!Component) {
    Component = UnsupportedAgg;
  } else if (!isMetricEnabled(model.type, uiRestrictions)) {
    Component = TemporaryUnsupportedAgg;
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
    () => seriesChangeHandler({ name, model: series, onChange }, siblings),
    [name, onChange, siblings, series]
  );

  useEffect(() => {
    const isNumericMetric = checkIfNumericMetric(model, fields, indexPattern);
    const isNumberFormatter = ![DATA_FORMATTERS.DEFAULT, DATA_FORMATTERS.CUSTOM].includes(
      series.formatter as DATA_FORMATTERS
    );

    if (isNumberFormatter && !isNumericMetric) {
      onChange({ formatter: DATA_FORMATTERS.DEFAULT });
    }
    // in case of string index pattern mode, change default formatter depending on metric type
    // "number" formatter for numeric metric and "" as custom formatter for any other type
    if (series.formatter === DATA_FORMATTERS.DEFAULT && !isKibanaIndexPattern) {
      onChange({
        formatter: isNumericMetric ? DATA_FORMATTERS.NUMBER : '',
      });
    }
  }, [indexPattern, model, onChange, fields, series.formatter, isKibanaIndexPattern]);

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
