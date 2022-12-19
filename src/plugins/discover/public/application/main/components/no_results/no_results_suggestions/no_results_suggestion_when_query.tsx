/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCode,
  EuiHorizontalRule,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiLink,
} from '@elastic/eui';

interface SyntaxExamples {
  title: string;
  items: Array<{ label: string; example: string }>;
}

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
  const [isModalOpen, setIsOpenOpen] = useState<boolean>(false);
  const examplesMeta = querySyntax ? EXAMPLES[querySyntax] : null;

  return (
    <>
      <EuiText data-test-subj="discoverNoResultsAdjustSearch">
        {examplesMeta ? (
          <FormattedMessage
            id="discover.noResults.suggestion.adjustYourQueryWithExamplesText"
            defaultMessage="Adjust your query, {seeExamplesLink}"
            values={{
              seeExamplesLink: (
                <EuiLink
                  data-test-subj="discoverNoResultsSeeQueryExamples"
                  onClick={() => setIsOpenOpen(true)}
                >
                  <FormattedMessage
                    id="discover.noResults.suggestion.seeQueryExamplesLinkText"
                    defaultMessage="see examples"
                  />
                </EuiLink>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="discover.noResults.suggestion.adjustYourQueryText"
            defaultMessage="Adjust your query"
          />
        )}
      </EuiText>
      {isModalOpen && !!examplesMeta && (
        <EuiModal
          onClose={() => {
            setIsOpenOpen(false);
          }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <h1>{examplesMeta.title}</h1>
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGrid columns={2} gutterSize="s">
              {examplesMeta.items.flatMap((item, index) => [
                <EuiFlexItem key={`${index}-label`}>
                  <EuiText size="s">{item.label}</EuiText>
                </EuiFlexItem>,
                <EuiFlexItem key={`${index}-example`}>
                  <EuiText size="s">
                    <EuiCode>{item.example}</EuiCode>
                  </EuiText>
                </EuiFlexItem>,
                <EuiFlexItem
                  key={`${index}-divider`}
                  css={css`
                    grid-column: span 2;
                  `}
                >
                  <EuiHorizontalRule margin="s" />
                </EuiFlexItem>,
              ])}
            </EuiFlexGrid>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
