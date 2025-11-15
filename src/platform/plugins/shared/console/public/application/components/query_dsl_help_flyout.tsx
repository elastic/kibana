/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';

interface QueryDslHelpFlyoutProps {
  onClose: () => void;
}

interface DocumentationSection {
  title: string;
  content: string;
}

export function QueryDslHelpFlyout({ onClose }: QueryDslHelpFlyoutProps) {
  const [searchText, setSearchText] = useState('');

  const documentationSections: DocumentationSection[] = useMemo(
    () => [
      {
        title: 'What is Query DSL?',
        content: `**Query DSL** is a full-featured JSON-style query language that enables complex searching, filtering, and aggregations. It is the original and most powerful query language for Elasticsearch.

The \`_search\` endpoint accepts queries written in Query DSL syntax.`,
      },
      {
        title: 'Search Techniques',
        content: `Query DSL supports a wide range of search techniques:

- **Full-text search**: Search text that has been analyzed and indexed to support phrase or proximity queries, fuzzy matches, and more
- **Keyword search**: Search for exact matches using \`keyword\` fields
- **Semantic search**: Search \`semantic_text\` fields using dense or sparse vector search
- **Vector search**: Search for similar dense vectors using the kNN algorithm
- **Geospatial search**: Search for locations and calculate spatial relationships`,
      },
      {
        title: 'Query and Filter Context',
        content: `Query clauses behave differently depending on their context:

**Query Context**: Answers "How well does this document match?" and calculates a relevance score (\`_score\`).

**Filter Context**: Answers "Does this document match?" with yes/no. Filters are faster, cached automatically, and don't calculate scores. Use filters for structured data like dates, numbers, and keywords.`,
      },
      {
        title: 'Leaf vs Compound Queries',
        content: `**Leaf query clauses**: Look for a particular value in a field, such as \`match\`, \`term\`, or \`range\` queries.

**Compound query clauses**: Wrap other leaf or compound queries to combine multiple queries logically (like \`bool\` or \`dis_max\`) or alter their behavior (like \`constant_score\`).`,
      },
      {
        title: 'Basic Query Structure',
        content: `A Query DSL request typically has the following structure:

\`\`\`json
GET /_search
{
  "query": {
    "match": {
      "field_name": "search_term"
    }
  }
}
\`\`\``,
      },
      {
        title: 'Match Query',
        content: `Full-text search on a field. Best for searching analyzed text fields:

\`\`\`json
GET /_search
{
  "query": {
    "match": {
      "title": "Elasticsearch"
    }
  }
}
\`\`\``,
      },
      {
        title: 'Term Query',
        content: `Search for exact values in keyword fields:

\`\`\`json
GET /_search
{
  "query": {
    "term": {
      "status": "published"
    }
  }
}
\`\`\``,
      },
      {
        title: 'Range Query',
        content: `Find documents with values within a range:

\`\`\`json
GET /_search
{
  "query": {
    "range": {
      "publish_date": {
        "gte": "2015-01-01",
        "lte": "2024-12-31"
      }
    }
  }
}
\`\`\``,
      },
      {
        title: 'Bool Query',
        content: `Combine multiple queries with boolean logic:

\`\`\`json
GET /_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Search" }}
      ],
      "filter": [
        { "term": { "status": "published" }},
        { "range": { "publish_date": { "gte": "2015-01-01" }}}
      ],
      "should": [
        { "match": { "content": "Elasticsearch" }}
      ],
      "must_not": [
        { "term": { "status": "draft" }}
      ]
    }
  }
}
\`\`\`

- \`must\`: Clauses must match (affects score)
- \`filter\`: Clauses must match (no score)
- \`should\`: Clauses should match (increases score)
- \`must_not\`: Clauses must not match (no score)`,
      },
      {
        title: 'Aggregations',
        content: `Aggregations analyze and summarize your data:

- **Metric**: Calculate metrics like sum, average, min, max
- **Bucket**: Group documents by field values, ranges, or criteria
- **Pipeline**: Run aggregations on results of other aggregations

\`\`\`json
GET /_search
{
  "aggs": {
    "avg_price": {
      "avg": { "field": "price" }
    }
  }
}
\`\`\``,
      },
      {
        title: 'Multi Match Query',
        content: `Search across multiple fields:

\`\`\`json
GET /_search
{
  "query": {
    "multi_match": {
      "query": "elasticsearch guide",
      "fields": ["title", "content", "description"]
    }
  }
}
\`\`\``,
      },
      {
        title: 'Wildcard and Fuzzy Search',
        content: `**Wildcard**: Pattern matching with \`*\` and \`?\`

\`\`\`json
{ "wildcard": { "user.id": "ki*y" }}
\`\`\`

**Fuzzy**: Match terms that are similar (handles typos)

\`\`\`json
{ "fuzzy": { "user.id": { "value": "ki" }}}
\`\`\``,
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!searchText.trim()) {
      return documentationSections;
    }

    const normalizedSearch = searchText.toLowerCase().trim();
    return documentationSections.filter(
      (section) =>
        section.title.toLowerCase().includes(normalizedSearch) ||
        section.content.toLowerCase().includes(normalizedSearch)
    );
  }, [searchText, documentationSections]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="queryDslHelpFlyout"
      data-test-subj="queryDslHelpFlyout"
      type="push"
      size="m"
      paddingSize="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="queryDslHelpFlyout">
            {i18n.translate('console.queryDslHelpFlyout.title', {
              defaultMessage: 'Query DSL quick reference',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFieldSearch
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={i18n.translate('console.queryDslHelpFlyout.searchPlaceholder', {
            defaultMessage: 'Search',
          })}
          aria-label={i18n.translate('console.queryDslHelpFlyout.searchAriaLabel', {
            defaultMessage: 'Search Query DSL documentation',
          })}
          data-test-subj="queryDslHelpSearch"
          fullWidth
          compressed
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          {filteredSections.length > 0 ? (
            filteredSections.map((section, index) => (
              <section key={section.title}>
                {index > 0 && <EuiSpacer size="l" />}
                <h3>{section.title}</h3>
                <Markdown readOnly enableSoftLineBreaks markdownContent={section.content} />
              </section>
            ))
          ) : (
            <p>
              {i18n.translate('console.queryDslHelpFlyout.noResultsMessage', {
                defaultMessage: 'No results found for "{searchText}"',
                values: { searchText },
              })}
            </p>
          )}
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
