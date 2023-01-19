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
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLink } from '@elastic/eui';
import { SyntaxExamples, SyntaxSuggestionsPopover } from './syntax_suggestions_popover';
import { type DiscoverServices } from '../../../../../build_services';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';

const getExamples = (
  querySyntax: string | undefined,
  docLinks: DiscoverServices['docLinks']
): SyntaxExamples | null => {
  if (!querySyntax) {
    return null;
  }

  if (querySyntax === 'lucene') {
    return {
      title: i18n.translate('discover.noResults.luceneExamples.title', {
        defaultMessage: 'Lucene examples',
      }),
      items: [
        {
          label: 'Find requests that contain the number 200, in any field',
          example: '200',
        },
        {
          label: 'Find 200 in the status field',
          example: 'status:200',
        },
        {
          label: 'Find all status codes between 400-499',
          example: 'status:[400 TO 499]',
        },
        {
          label: 'Find status codes 400-499 with the extension php',
          example: 'status:[400 TO 499] AND extension:PHP',
        },
        {
          label: 'Find status codes 400-499 with the extension php or html',
          example: 'status:[400 TO 499] AND (extension:php OR extension:html)',
        },
      ],
      footer: (
        <FormattedMessage
          id="discover.noResults.luceneExamples.footerDescription"
          defaultMessage="Learn more about {luceneLink}"
          values={{
            luceneLink: (
              <EuiLink href={docLinks.links.query.luceneQuerySyntax} target="_blank">
                <FormattedMessage
                  id="discover.noResults.luceneExamples.footerLuceneLink"
                  defaultMessage="query string syntax"
                />
              </EuiLink>
            ),
          }}
        />
      ),
    };
  }

  if (querySyntax === 'kuery') {
    return {
      title: i18n.translate('discover.noResults.kqlExamples.title', {
        defaultMessage: 'KQL examples',
      }),
      items: [
        {
          label: 'Filter for documents where a field exists',
          example: 'http.request.method: *',
        },
        {
          label: 'Filter for documents that match a value',
          example: 'http.request.method: GET',
        },
        {
          label: 'Filter for documents within a range',
          example: 'http.response.bytes > 10000 and http.response.bytes <= 20000',
        },
        {
          label: 'Filter for documents using wildcards',
          example: 'http.response.status_code: 4*',
        },
        {
          label: 'Negating a query',
          example: 'NOT http.request.method: GET',
        },
        {
          label: 'Combining multiple queries with AND/OR',
          example: 'http.request.method: GET AND http.response.status_code: 400',
        },
        {
          label: 'Querying multiple values for the same field',
          example: 'http.request.method: (GET OR POST OR DELETE)',
        },
      ],
      footer: (
        <FormattedMessage
          id="discover.noResults.kqlExamples.kqlDescription"
          defaultMessage="Learn more about {kqlLink}"
          values={{
            kqlLink: (
              <EuiLink href={docLinks.links.query.kueryQuerySyntax} target="_blank">
                <FormattedMessage
                  id="discover.noResults.kqlExamples.footerKQLLink"
                  defaultMessage="KQL"
                />
              </EuiLink>
            ),
          }}
        />
      ),
    };
  }

  return null;
};

export interface NoResultsSuggestionWhenQueryProps {
  querySyntax: string | undefined;
}

export const NoResultsSuggestionWhenQuery: React.FC<NoResultsSuggestionWhenQueryProps> = ({
  querySyntax,
}) => {
  const services = useDiscoverServices();
  const { docLinks } = services;
  const examplesMeta = getExamples(querySyntax, docLinks);

  return (
    <>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="discoverNoResultsAdjustSearch">
            {examplesMeta ? (
              <FormattedMessage
                id="discover.noResults.suggestion.adjustYourQueryWithExamplesText"
                defaultMessage="Try a different query syntax"
              />
            ) : (
              <FormattedMessage
                id="discover.noResults.suggestion.adjustYourQueryText"
                defaultMessage="Adjust your query"
              />
            )}
          </EuiText>
        </EuiFlexItem>
        {!!examplesMeta && (
          <EuiFlexItem grow={false}>
            <SyntaxSuggestionsPopover meta={examplesMeta} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
