/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import {
  type SearchResponseWarning,
  SearchResponseWarningsBadge,
} from '@kbn/search-response-warnings';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';

const containerStyles = css`
  width: 100%;
  position: relative;
`;

export interface SavedSearchEmbeddableBaseProps {
  isLoading: boolean;
  totalHitCount?: number;
  prepend?: React.ReactElement;
  append?: React.ReactElement;
  dataTestSubj?: string;
  interceptedWarnings?: SearchResponseWarning[];
}

export const SavedSearchEmbeddableBase: FC<PropsWithChildren<SavedSearchEmbeddableBaseProps>> = ({
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

      {Boolean(prepend || totalHitCount) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            justifyContent="flexEnd"
            alignItems="center"
            gutterSize="xs"
            responsive={false}
            wrap={true}
          >
            {Boolean(prepend) && <EuiFlexItem grow={false}>{prepend}</EuiFlexItem>}

            {!!totalHitCount && (
              <EuiFlexItem grow={false} data-test-subj="toolBarTotalDocsText">
                <TotalDocuments totalHitCount={totalHitCount} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      <EuiFlexItem css={{ minHeight: 0 }}>{children}</EuiFlexItem>

      {Boolean(append) && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}

      <SearchResponseWarningsBadge warnings={interceptedWarnings ?? []} />
    </EuiFlexGroup>
  );
};
