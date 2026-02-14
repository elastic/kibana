/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { ViewDetailsPopover } from './view_details_popover';
import { getWarningsDescription } from './i18n_utils';
import { FailureReasons } from './failure_reasons';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsEmptyPrompt: React.FC<Props> = ({ warnings }) => {
  return (
    <EuiEmptyPrompt
      iconType="warning"
      color="warning"
      title={
        <h2>
          {i18n.translate('searchResponseWarnings.noResultsTitle', {
            defaultMessage: 'No results found',
          })}
        </h2>
      }
      body={
        <div>
          <div>{getWarningsDescription(warnings)}</div>
          <div>
            <EuiText size="s">
              <FailureReasons warnings={warnings} />
            </EuiText>
          </div>
        </div>
      }
      actions={<ViewDetailsPopover warnings={warnings} />}
      data-test-subj="searchResponseWarningsEmptyPrompt"
    />
  );
};
