/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { Pagination as PaginationType } from '@elastic/eui';

import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { EmptyViewerState, ExceptionItemCard, ExceptionsUtility, Pagination } from '../..';

import type {
  RuleReferences,
  ExceptionListItemIdentifiers,
  ViewerStatus,
  GetExceptionItemProps,
} from '../types';

const exceptionItemCss = css`
  margin: ${euiThemeVars.euiSize} 0;
  &:first-child {
    margin: ${euiThemeVars.euiSizeS}0 ${euiThemeVars.euiSize};
  }
`;

interface ExceptionItemsProps {
  lastUpdated: string | number | null;
  viewerStatus: ViewerStatus;
  isReadOnly: boolean;
  emptyViewerTitle?: string;
  emptyViewerBody?: string;
  emptyViewerButtonText?: string;
  exceptions: ExceptionListItemSchema[];
  listType: ExceptionListTypeEnum;
  ruleReferences: RuleReferences;
  pagination: PaginationType;
  securityLinkAnchorComponent: React.ElementType;
  onCreateExceptionListItem?: () => void;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
}

const ExceptionItemsComponent: FC<ExceptionItemsProps> = ({
  lastUpdated,
  viewerStatus,
  isReadOnly,
  exceptions,
  listType,
  ruleReferences,
  emptyViewerTitle,
  emptyViewerBody,
  emptyViewerButtonText,
  pagination,
  securityLinkAnchorComponent,
  onPaginationChange,
  onDeleteException,
  onEditExceptionItem,
  onCreateExceptionListItem,
}) => {
  if (!exceptions.length || viewerStatus)
    return (
      <EmptyViewerState
        isReadOnly={isReadOnly}
        title={emptyViewerTitle}
        viewerStatus={viewerStatus}
        buttonText={emptyViewerButtonText}
        body={emptyViewerBody}
        onCreateExceptionListItem={onCreateExceptionListItem}
      />
    );
  return (
    <>
      <ExceptionsUtility pagination={pagination} lastUpdated={lastUpdated} />
      <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
        <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
          <EuiFlexGroup
            css={exceptionItemCss}
            data-test-subj="exceptionsContainer"
            gutterSize="none"
            direction="column"
          >
            {exceptions.map((exception) => (
              <EuiFlexItem data-test-subj="exceptionItemContainer" grow={false} key={exception.id}>
                <ExceptionItemCard
                  disableActions={isReadOnly}
                  exceptionItem={exception}
                  listType={listType}
                  ruleReferences={
                    Object.keys(ruleReferences).length ? ruleReferences[exception.list_id] : []
                  }
                  onDeleteException={onDeleteException}
                  onEditException={onEditExceptionItem}
                  dataTestSubj="exceptionItemsViewerItem"
                  securityLinkAnchorComponent={securityLinkAnchorComponent}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Pagination
        dataTestSubj="listWithSearch{Pagination"
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
};

ExceptionItemsComponent.displayName = 'ExceptionItemsComponent';

export const ExceptionItems = React.memo(ExceptionItemsComponent);

ExceptionItems.displayName = 'ExceptionsItems';
