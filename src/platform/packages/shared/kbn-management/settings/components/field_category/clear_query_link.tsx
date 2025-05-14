/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

/**
 * Props for the {@link ClearQueryLink} component.
 */
export interface ClearQueryLinkProps {
  /** The total number of fields in the category. */
  fieldCount: number;
  /** The number of fields currently being displayed. */
  displayCount: number;
  /** Handler to invoke when clearing the current filtering query. */
  onClearQuery: () => void;
}

/**
 * Component for displaying a link to clear the current filtering query.
 */
export const ClearQueryLink = ({ fieldCount, displayCount, onClearQuery }: ClearQueryLinkProps) => {
  if (fieldCount === displayCount) {
    return null;
  }

  const linkCSS = css`
    font-style: italic;
  `;

  return (
    <EuiText css={linkCSS} size="s">
      <FormattedMessage
        id="management.settings.fieldCategory.searchResultText"
        defaultMessage="Search terms are hiding {settingsCount} settings {clearSearch}"
        values={{
          settingsCount: fieldCount - displayCount,
          clearSearch: (
            <EuiLink onClick={onClearQuery}>
              <EuiText css={linkCSS} size="s">
                <FormattedMessage
                  id="management.settings.fieldCategory.clearSearchResultText"
                  defaultMessage="(clear search)"
                />
              </EuiText>
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
};
