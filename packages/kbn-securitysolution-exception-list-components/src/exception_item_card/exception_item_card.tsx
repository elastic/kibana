/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, ElementType } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiCommentProps } from '@elastic/eui';
import type {
  CommentsArray,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  ExceptionItemCardHeader,
  ExceptionItemCardConditions,
  ExceptionItemCardMetaInfo,
  ExceptionItemCardComments,
} from '.';

import type { ExceptionListItemIdentifiers, Rule } from '../types';
import { useExceptionItemCard } from './use_exception_item_card';

export interface ExceptionItemProps {
  dataTestSubj?: string;
  disableActions?: boolean;
  exceptionItem: ExceptionListItemSchema;
  listType: ExceptionListTypeEnum;
  ruleReferences: Rule[];
  editActionLabel?: string;
  deleteActionLabel?: string;
  securityLinkAnchorComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  formattedDateComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  getFormattedComments: (comments: CommentsArray) => EuiCommentProps[]; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
  showValueListModal: ElementType;
}

const ExceptionItemCardComponent: FC<ExceptionItemProps> = ({
  disableActions = false,
  exceptionItem,
  listType,
  ruleReferences,
  dataTestSubj,
  editActionLabel,
  deleteActionLabel,
  securityLinkAnchorComponent,
  formattedDateComponent,
  getFormattedComments,
  onDeleteException,
  onEditException,
  showValueListModal,
}) => {
  const { actions, formattedComments } = useExceptionItemCard({
    listType,
    editActionLabel,
    deleteActionLabel,
    exceptionItem,
    getFormattedComments,
    onEditException,
    onDeleteException,
  });
  return (
    <EuiPanel
      key={`${exceptionItem.id}exceptionItemPanel`}
      paddingSize="l"
      data-test-subj={dataTestSubj || ''}
      hasBorder
      hasShadow={false}
    >
      <EuiFlexGroup responsive gutterSize="m" direction="column">
        <EuiFlexItem data-test-subj="exceptionItemCardHeaderContainer">
          <ExceptionItemCardHeader
            item={exceptionItem}
            actions={actions}
            disableActions={disableActions}
            dataTestSubj="exceptionItemCardHeader"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="exceptionItemCardMeta">
          <ExceptionItemCardMetaInfo
            item={exceptionItem}
            rules={ruleReferences}
            dataTestSubj="exceptionItemCardMetaInfo"
            securityLinkAnchorComponent={securityLinkAnchorComponent}
            formattedDateComponent={formattedDateComponent}
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="exceptionItemCardCondition">
          <ExceptionItemCardConditions
            os={exceptionItem.os_types}
            entries={exceptionItem.entries}
            dataTestSubj="exceptionItemCardConditions"
            showValueListModal={showValueListModal}
          />
        </EuiFlexItem>
        {formattedComments.length > 0 && (
          <ExceptionItemCardComments
            dataTestSubj="exceptionsItemCommentAccordion"
            comments={formattedComments}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExceptionItemCardComponent.displayName = 'ExceptionItemCardComponent';

export const ExceptionItemCard = React.memo(ExceptionItemCardComponent);

ExceptionItemCard.displayName = 'ExceptionItemCard';
