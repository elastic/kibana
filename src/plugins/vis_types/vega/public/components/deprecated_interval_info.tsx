/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { VegaSpec } from '../data_model/types';
import { getDocLinks } from '../services';

import { BUCKET_TYPES } from '../../../../data/public';

export const DeprecatedHistogramIntervalInfo = () => (
  <EuiCallOut
    className="hide-for-sharing"
    data-test-subj="deprecatedHistogramIntervalInfo"
    size="s"
    title={
      <FormattedMessage
        id="visTypeVega.deprecatedHistogramIntervalInfo.message"
        defaultMessage="Combined 'interval' field has been deprecated in favor of two new,
        explicit fields: 'calendar_interval' and 'fixed_interval'. {dateHistogramDoc}"
        values={{
          dateHistogramDoc: (
            <EuiButtonIcon
              iconType="popout"
              href={getDocLinks().links.aggs.date_histogram}
              target="_blank"
            />
          ),
        }}
      />
    }
    iconType="help"
  />
);

export const shouldShowDeprecatedHistogramIntervalInfo = (spec: VegaSpec) => {
  const data = Array.isArray(spec.data) ? spec?.data : [spec.data];

  return data.some((dataItem = {}) => {
    const aggs = dataItem.url?.body?.aggs ?? {};

    return Object.keys(aggs).some((key) => {
      const dateHistogram = aggs[key]?.[BUCKET_TYPES.DATE_HISTOGRAM] || {};
      return 'interval' in dateHistogram && typeof dateHistogram.interval !== 'object';
    });
  });
};
