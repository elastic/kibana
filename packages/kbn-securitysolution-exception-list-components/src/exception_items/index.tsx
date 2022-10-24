/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ElementType } from 'react';
import { css } from '@emotion/react';
import type { FC } from 'react';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { Pagination as PaginationType } from '@elastic/eui';

import type {
  CommentsArray,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { euiThemeVars } from '@kbn/ui-theme';
import { EmptyViewerState, ExceptionItemCard, Pagination } from '../..';

import type {
  RuleReferences,
  ExceptionListItemIdentifiers,
  ViewerStatus,
  GetExceptionItemProps,
} from '../types';

const exceptionItemCss = css`
  margin: ${euiThemeVars.euiSize} 0;
  &div:first-child {
    margin: ${euiThemeVars.euiSizeXS} 0 ${euiThemeVars.euiSize};
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
  editActionLabel?: string;
  deleteActionLabel?: string;
  dataTestSubj?: string;
  securityLinkAnchorComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  formattedDateComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  exceptionsUtilityComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  getFormattedComments: (comments: CommentsArray) => EuiCommentProps[]; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
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
  dataTestSubj,
  editActionLabel,
  deleteActionLabel,
  securityLinkAnchorComponent,
  exceptionsUtilityComponent,
  formattedDateComponent,
  getFormattedComments,
  onPaginationChange,
  onDeleteException,
  onEditExceptionItem,
  onCreateExceptionListItem,
}) => {
  const ExceptionsUtility = exceptionsUtilityComponent;
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
      <EuiFlexGroup direction="column" gutterSize="none" className="eui-yScrollWithShadows">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            css={exceptionItemCss}
            data-test-subj={`${dataTestSubj || ''}exceptionsContainer`}
            direction="column"
            gutterSize="m"
          >
            {exceptions.map((exception) => (
              <EuiFlexItem
                data-test-subj={`${dataTestSubj || ''}exceptionItemContainer`}
                grow={false}
                key={exception.id}
              >
                <ExceptionItemCard
                  key={`${exception.id}exceptionItemCardKey`}
                  dataTestSubj={`${dataTestSubj || ''}exceptionItemCard`}
                  disableActions={isReadOnly}
                  exceptionItem={exception}
                  listType={listType}
                  ruleReferences={
                    Object.keys(ruleReferences).length && ruleReferences[exception.list_id]
                      ? ruleReferences[exception.list_id].referenced_rules
                      : []
                  }
                  editActionLabel={editActionLabel}
                  deleteActionLabel={deleteActionLabel}
                  onDeleteException={onDeleteException}
                  onEditException={onEditExceptionItem}
                  securityLinkAnchorComponent={securityLinkAnchorComponent}
                  formattedDateComponent={formattedDateComponent}
                  getFormattedComments={getFormattedComments}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Pagination
        dataTestSubj={`${dataTestSubj || ''}pagination`}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
};

ExceptionItemsComponent.displayName = 'ExceptionItemsComponent';

export const ExceptionItems = React.memo(ExceptionItemsComponent);

ExceptionItems.displayName = 'ExceptionsItems';
