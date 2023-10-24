/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ViewDetailsPopover } from './view_details_popover';
import { getWarningsDescription, getWarningsTitle } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsEmptyPrompt = (props: Props) => {
  if (!props.warnings.length) {
    return null;
  }

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
        <EuiText textAlign="left" size="s" grow={false}>
          <strong>
            {getWarningsTitle(props.warnings)}
          </strong>
          <p>
            {getWarningsDescription(props.warnings, i18n.translate('searchResponseWarnings.description.pageLabel', {
            defaultMessage: 'page',
          }))}
          </p>
          <ViewDetailsPopover warnings={props.warnings} />
        </EuiText>
      }
    />
  );
};
