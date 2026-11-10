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
  mathWithUnits,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { QueryTemplate } from '@kbn/esql-language';

const RUN_BUTTON_CLASS = 'discoverRecommendedQuery__run';

// Share of the viewport the section takes, below and from the EUI `xl` breakpoint.
const SECTION_VIEWPORT_SHARE = { default: 85, wide: 75 };

const cardStyles = css`
  .${RUN_BUTTON_CLASS} {
    opacity: 0;
  }

  &:hover .${RUN_BUTTON_CLASS}, &:focus-within .${RUN_BUTTON_CLASS} {
    opacity: 1;
  }

  @media (hover: none) {
    .${RUN_BUTTON_CLASS} {
      opacity: 1;
    }
  }
`;

const runLabel = (label: string) =>
  i18n.translate('discover.recommendedQueries.runQueryAriaLabel', {
    defaultMessage: 'Run query: {label}',
    values: { label },
  });

export interface RecommendedQueriesProps {
  queries: readonly QueryTemplate[];
  onRunQuery: (query: string) => void;
}

const RecommendedQueryCard = ({
  query: { label, description, queryString },
  onRunQuery,
}: {
  query: QueryTemplate;
  onRunQuery: (query: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const codeBlockHeight = mathWithUnits(
    [euiTheme.size.xxxxl, euiTheme.size.xxxl],
    (xxxxl, xxxl) => xxxxl + xxxl
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s" css={cardStyles}>
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
              className={RUN_BUTTON_CLASS}
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
        overflowHeight={codeBlockHeight}
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
    <section
      aria-labelledby={titleId}
      data-test-subj="discoverRecommendedQueries"
      css={{
        paddingInline: euiTheme.size.l,
        boxSizing: 'border-box',
        minWidth: 0,
        width: `${SECTION_VIEWPORT_SHARE.default}vw`,
        maxWidth: '100%',
        [`@media (max-width: ${euiTheme.breakpoint.m - 1}px)`]: {
          paddingTop: euiTheme.size.l,
        },
        [`@media (min-width: ${euiTheme.breakpoint.xl}px)`]: {
          width: `${SECTION_VIEWPORT_SHARE.wide}vw`,
        },
      }}
    >
      <EuiTitle size="xs">
        <h2 id={titleId}>
          {i18n.translate('discover.recommendedQueries.title', {
            defaultMessage: 'Recommended queries',
          })}
        </h2>
      </EuiTitle>
      <EuiFlexGrid
        columns={3}
        gutterSize="m"
        css={{
          marginTop: euiTheme.size.base,
          width: '100%',
          minWidth: 0,
          // minmax(0, 1fr) keeps long queries from stretching the columns.
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          [`@media (max-width: ${euiTheme.breakpoint.m - 1}px)`]: {
            gridTemplateColumns: '1fr',
          },
        }}
      >
        {queries.map((query) => (
          <EuiFlexItem key={query.queryString}>
            <RecommendedQueryCard query={query} onRunQuery={onRunQuery} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </section>
  );
};
