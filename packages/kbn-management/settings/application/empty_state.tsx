/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

/**
 * Props for a {@link EmptyState} component.
 */
interface EmptyStateProps {
  queryText: string | undefined;
  onClearQuery: () => void;
}

/**
 * Component for displaying a prompt to inform that no settings are found for a given query.
 */
export const EmptyState = ({ queryText, onClearQuery }: EmptyStateProps) => (
  <EuiCallOut
    color="danger"
    title={
      <>
        <FormattedMessage
          id="management.settings.emptyState.noSearchResultText"
          defaultMessage="No settings found for {queryText} {clearSearch}"
          values={{
            clearSearch: (
              <EuiLink onClick={onClearQuery}>
                <FormattedMessage
                  id="management.settings.emptyState.clearNoSearchResultText"
                  defaultMessage="(clear search)"
                />
              </EuiLink>
            ),
            queryText: <strong>{queryText}</strong>,
          }}
        />
      </>
    }
  />
);
