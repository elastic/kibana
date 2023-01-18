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
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SyntaxExamples, SyntaxSuggestionsPopover } from './syntax_suggestions_popover';

const EXAMPLES: Record<string, SyntaxExamples> = {
  lucene: {
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
  },
  // TODO: add examples for 'kuery'
};

export interface NoResultsSuggestionWhenQueryProps {
  querySyntax: string | undefined;
}

export const NoResultsSuggestionWhenQuery: React.FC<NoResultsSuggestionWhenQueryProps> = ({
  querySyntax,
}) => {
  const examplesMeta = querySyntax ? EXAMPLES[querySyntax] : null;

  return (
    <>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="discoverNoResultsAdjustSearch">
            {examplesMeta ? (
              <FormattedMessage
                id="discover.noResults.suggestion.adjustYourQueryWithExamplesText"
                defaultMessage="Adjust your query, try a different syntax"
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
            <SyntaxSuggestionsPopover title={examplesMeta.title} items={examplesMeta.items} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
