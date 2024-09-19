/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiCallOut } from '@elastic/eui';

const rollupBetaWarningTitle = i18n.translate(
  'indexPatternEditor.rollupIndexPattern.warning.title',
  {
    defaultMessage: 'Beta feature',
  }
);

export const RollupBetaWarning = () => (
  <EuiCallOut title={rollupBetaWarningTitle} color="warning" iconType="help">
    <p>
      <FormattedMessage
        id="indexPatternEditor.rollupIndexPattern.warning.textParagraphOne"
        defaultMessage="Kibana's support for rollup index patterns is in beta. You might encounter
issues using these patterns in saved searches, visualizations, and dashboards. They
are not supported in some advanced features, such as Timelion, and Machine Learning."
      />
    </p>
    <p>
      <FormattedMessage
        id="indexPatternEditor.rollupIndexPattern.warning.textParagraphTwo"
        defaultMessage="You can match a rollup index pattern against one rollup index and zero or more
regular indices. A rollup index pattern has limited metrics, fields, intervals, and
aggregations. A rollup index is limited to indices that have one job configuration,
or multiple jobs with compatible configurations."
      />
    </p>
  </EuiCallOut>
);
