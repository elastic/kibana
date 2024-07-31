/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { DocLinksStart } from '@kbn/core/public';

interface RollupDeprecatedWarningProps {
  docLinksService: DocLinksStart;
}

const rollupBetaWarningTitle = i18n.translate(
  'indexPatternEditor.rollupIndexPattern.deprecationWarning.title',
  {
    defaultMessage: 'Deprecated in 8.11.0',
  }
);

export const RollupDeprecatedWarning = ({ docLinksService }: RollupDeprecatedWarningProps) => (
  <EuiCallOut
    title={rollupBetaWarningTitle}
    color="warning"
    iconType="help"
    data-test-subj="rollupDeprecationCallout"
  >
    <FormattedMessage
      id="indexPatternEditor.rollupDataView.deprecationWarning.textParagraphOne"
      defaultMessage="Rollups are deprecated and will be removed in a future version. {downsamplingLink} can be used as an alternative."
      values={{
        downsamplingLink: (
          <EuiLink
            href={docLinksService.links.elasticsearch.rollupMigratingToDownsampling}
            target="_blank"
            data-test-subj="downsamplingLink"
          >
            {i18n.translate(
              'indexPatternEditor.rollupDataView.deprecationWarning.downsamplingLink',
              {
                defaultMessage: 'Downsampling',
              }
            )}
          </EuiLink>
        ),
      }}
    />
  </EuiCallOut>
);
