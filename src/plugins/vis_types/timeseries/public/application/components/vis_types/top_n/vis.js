/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCoreStart } from '../../../../services';
import { getMetricsField } from '../../lib/get_metrics_field';
import { createTickFormatter } from '../../lib/tick_formatter';
import { createFieldFormatter } from '../../lib/create_field_formatter';
import { TopN } from '../../../visualizations/views/top_n';
import { getLastValue } from '../../../../../common/last_value_utils';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';
import { replaceVars } from '../../lib/replace_vars';
import PropTypes from 'prop-types';
import React, { useState, useCallback } from 'react';
import { sortBy, first, get } from 'lodash';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { getOperator, shouldOperate } from '../../../../../common/operators_utils';
import { ExternalUrlErrorModal } from '../../lib/external_url_error_modal';
import { SERIES_SEPARATOR } from '../../../../../common/constants';

function sortByDirection(data, direction, fn) {
  if (direction === 'desc') {
    return sortBy(data, fn).reverse();
  }
  return sortBy(data, fn);
}

function sortSeries(visData, model) {
  const series = get(visData, `${model.id}.series`, []);
  return model.series.reduce((acc, item) => {
    const itemSeries = series.filter((s) => {
      const id = first(s.id.split(SERIES_SEPARATOR));
      return id === item.id;
    });
    const direction = item.terms_direction || 'desc';
    if (item.terms_order_by === '_key') return acc.concat(itemSeries);
    return acc.concat(sortByDirection(itemSeries, direction, (s) => getLastValue(s.data)));
  }, []);
}

function TopNVisualization(props) {
  const [accessDeniedDrilldownUrl, setAccessDeniedDrilldownUrl] = useState(null);
  const coreStart = getCoreStart();
  const { backgroundColor, model, visData, fieldFormatMap, getConfig } = props;

  const series = sortSeries(visData, model).map((item) => {
    const id = first(item.id.split(SERIES_SEPARATOR));
    const seriesConfig = model.series.find((s) => s.id === id);
    if (seriesConfig) {
      const tickFormatter =
        seriesConfig.formatter === DATA_FORMATTERS.DEFAULT
          ? createFieldFormatter(getMetricsField(seriesConfig.metrics), fieldFormatMap, 'html')
          : createTickFormatter(seriesConfig.formatter, seriesConfig.value_template, getConfig);

      const value = getLastValue(item.data);
      let color = item.color || seriesConfig.color;
      if (model.bar_color_rules) {
        model.bar_color_rules.forEach((rule) => {
          if (shouldOperate(rule, value) && rule.operator && rule.bar_color) {
            if (getOperator(rule.operator)(value, rule.value)) {
              color = rule.bar_color;
            }
          }
        });
      }
      return {
        ...item,
        color,
        tickFormatter,
      };
    }
    return item;
  });

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  const params = {
    series: series,
    reversed: isBackgroundInverted(panelBackgroundColor),
  };

  if (model.drilldown_url) {
    params.onClick = (item) => {
      const url = replaceVars(model.drilldown_url, {}, { key: item.label }, { noEscape: true });
      const validatedUrl = coreStart.http.externalUrl.validateUrl(url);
      if (validatedUrl) {
        setAccessDeniedDrilldownUrl(null);
        coreStart.application.navigateToUrl(url);
      } else {
        setAccessDeniedDrilldownUrl(url);
      }
    };
  }

  const closeExternalUrlErrorModal = useCallback(() => setAccessDeniedDrilldownUrl(null), []);

  return (
    <div className="tvbVis" style={style}>
      <TopN {...params} />
      {accessDeniedDrilldownUrl && (
        <ExternalUrlErrorModal
          url={accessDeniedDrilldownUrl}
          handleClose={closeExternalUrlErrorModal}
        />
      )}
    </div>
  );
}

TopNVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onFilterClick: PropTypes.func,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  getConfig: PropTypes.func,
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TopNVisualization as default };
