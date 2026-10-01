/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { QueryTemplate } from '@kbn/esql-language';

const MAX_RECOMMENDED_QUERIES = 6;

const runLabel = (label: string) =>
  i18n.translate('discover.recommendedQueries.runQueryAriaLabel', {
    defaultMessage: 'Run query: {label}',
    values: { label },
  });

export interface RecommendedQueriesProps {
  // Query templates built from the source of the previous tab
  queries: readonly QueryTemplate[];
  // Called with the query string of the card the user wants to run
  onRunQuery: (query: string) => void;
}

const RecommendedQueryCard = ({
  query: { label, description, queryString },
  onRunQuery,
}: {
  query: QueryTemplate;
  onRunQuery: (query: string) => void;
}) => {
  // The run button is revealed on hover, and on focus so keyboard users can reach it.
  const [isActive, setIsActive] = useState(false);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
    >
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="flexStart"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{label}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={runLabel(label)} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="play"
              display="fill"
              size="s"
              aria-label={runLabel(label)}
              onClick={() => onRunQuery(queryString)}
              css={{ opacity: isActive ? 1 : 0 }}
              data-test-subj="discoverRecommendedQueryRun"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiCodeBlock
        language="esql"
        fontSize="s"
        paddingSize="s"
        isCopyable
        css={{ marginTop: euiTheme.size.m }}
      >
        {queryString}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

export const RecommendedQueries = ({ queries, onRunQuery }: RecommendedQueriesProps) => {
  const titleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();

  if (!queries.length) {
    return null;
  }

  return (
    <section aria-labelledby={titleId} data-test-subj="discoverRecommendedQueries">
      <EuiTitle size="xs">
        <h2 id={titleId}>
          {i18n.translate('discover.recommendedQueries.title', {
            defaultMessage: 'Recommended queries',
          })}
        </h2>
      </EuiTitle>
      <EuiFlexGrid columns={3} gutterSize="m" css={{ marginTop: euiTheme.size.base }}>
        {queries.slice(0, MAX_RECOMMENDED_QUERIES).map((query) => (
          <EuiFlexItem key={query.label}>
            <RecommendedQueryCard query={query} onRunQuery={onRunQuery} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </section>
  );
};
