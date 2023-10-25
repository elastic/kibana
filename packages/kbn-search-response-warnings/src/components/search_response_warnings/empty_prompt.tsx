/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import { ViewDetailsPopover } from './view_details_popover';
import { getNonSuccessfulClusters } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsEmptyPrompt = (props: Props) => {
  const nonSuccessfulClusters = getNonSuccessfulClusters(props.warnings);

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
      body={i18n.translate('searchResponseWarnings.emptyPromptBody', {
        defaultMessage:
          '{nonSuccessfulClustersCount} {nonSuccessfulClustersCount, plural, one {cluster} other {clusters}} had issues returning data. This might result in incomplete data.',
        values: {
          nonSuccessfulClustersCount: nonSuccessfulClusters.size,
        },
      })}
      actions={<ViewDetailsPopover warnings={props.warnings} />}
      data-test-subj="searchResponseWarningsEmptyPrompt"
    />
  );
};
