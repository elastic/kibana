/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import type { SearchResponseInterceptedWarning } from '@kbn/search-response-warnings';
import { TotalDocuments } from '../application/main/components/total_documents/total_documents';
import { SavedSearchEmbeddableBadge } from './saved_search_embeddable_badge';

const containerStyles = css`
  width: 100%;
  position: relative;
`;

export interface SavedSearchEmbeddableBaseProps {
  isLoading: boolean;
  totalHitCount: number;
  prepend?: React.ReactElement;
  append?: React.ReactElement;
  dataTestSubj?: string;
  interceptedWarnings?: SearchResponseInterceptedWarning[];
}

export const SavedSearchEmbeddableBase: React.FC<SavedSearchEmbeddableBaseProps> = ({
  isLoading,
  totalHitCount,
  prepend,
  append,
  dataTestSubj,
  interceptedWarnings,
  children,
}) => {
  return (
    <EuiFlexGroup
      css={containerStyles}
      direction="column"
      gutterSize="xs"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={true}
        >
          {Boolean(prepend) && <EuiFlexItem grow={false}>{prepend}</EuiFlexItem>}

          {Boolean(totalHitCount) && (
            <EuiFlexItem grow={false} data-test-subj="toolBarTotalDocsText">
              <TotalDocuments totalHitCount={totalHitCount} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem style={{ minHeight: 0 }}>{children}</EuiFlexItem>

      {Boolean(append) && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}

      {Boolean(interceptedWarnings?.length) && (
        <div>
          <SavedSearchEmbeddableBadge interceptedWarnings={interceptedWarnings} />
        </div>
      )}
    </EuiFlexGroup>
  );
};
