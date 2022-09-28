/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback, FC } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiCommentProps } from '@elastic/eui';
import type {
  CommentsArray,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import {
  ExceptionItemCardHeader,
  ExceptionItemCardConditions,
  ExceptionItemCardMetaInfo,
  ExceptionItemCardComments,
} from '.';

import type { ExceptionListItemIdentifiers } from '../types';

export interface ExceptionItemProps {
  dataTestSubj?: string;
  disableActions?: boolean;
  exceptionItem: ExceptionListItemSchema;
  listType: ExceptionListTypeEnum;
  ruleReferences: any[]; // rulereferences
  editActionLabel?: string;
  deleteActionLabel?: string;
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  formattedDateComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  getFormattedComments: (comments: CommentsArray) => EuiCommentProps[]; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
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
}) => {
  const handleDelete = useCallback((): void => {
    onDeleteException({
      id: exceptionItem.id,
      name: exceptionItem.name,
      namespaceType: exceptionItem.namespace_type,
    });
  }, [onDeleteException, exceptionItem.id, exceptionItem.name, exceptionItem.namespace_type]);

  const handleEdit = useCallback((): void => {
    onEditException(exceptionItem);
  }, [onEditException, exceptionItem]);

  const formattedComments = useMemo((): EuiCommentProps[] => {
    return getFormattedComments(exceptionItem.comments);
  }, [exceptionItem.comments, getFormattedComments]);

  const actions: Array<{
    key: string;
    icon: string;
    label: string | boolean;
    onClick: () => void;
  }> = useMemo(
    () => [
      {
        key: 'edit',
        icon: 'controlsHorizontal',
        label: editActionLabel || i18n.exceptionItemCardEditButton(listType),
        onClick: handleEdit,
      },
      {
        key: 'delete',
        icon: 'trash',
        label: deleteActionLabel || listType === i18n.exceptionItemCardDeleteButton(listType),
        onClick: handleDelete,
      },
    ],
    [editActionLabel, listType, deleteActionLabel, handleDelete, handleEdit]
  );
  return (
    <EuiPanel paddingSize="l" data-test-subj={dataTestSubj} hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="m" direction="column">
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
            references={ruleReferences}
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
          />
        </EuiFlexItem>
        {formattedComments.length > 0 && (
          <ExceptionItemCardComments
            data-test-subj="exceptionItemCard-comment"
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
