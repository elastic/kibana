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
import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function DocViewTableRowIconUnderscore() {
  const ariaLabel = i18n.translate(
    'kbn.discover.docViews.table.fieldNamesBeginningWithUnderscoreUnsupportedAriaLabel',
    {
      defaultMessage: 'Warning',
    }
  );
  const tooltipContent = i18n.translate(
    'kbn.discover.docViews.table.fieldNamesBeginningWithUnderscoreUnsupportedTooltip',
    {
      defaultMessage: 'Field names beginning with {underscoreSign} are not supported',
      values: { underscoreSign: '_' },
    }
  );

  return (
    <EuiIconTip
      aria-label={ariaLabel}
      content={tooltipContent}
      color="warning"
      iconProps={{
        className: 'kbnDocViewer__warning',
        'data-test-subj': 'underscoreWarning',
      }}
      size="s"
      type="alert"
    />
  );
}
