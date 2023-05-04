/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
import { EuiCommentProps } from '@elastic/eui';

import {
  CommentsArray,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import { ExceptionListItemIdentifiers } from '../types';

interface UseExceptionItemCardProps {
  exceptionItem: ExceptionListItemSchema;
  listType: ExceptionListTypeEnum;
  editActionLabel?: string;
  deleteActionLabel?: string;
  getFormattedComments: (comments: CommentsArray) => EuiCommentProps[]; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditException: (item: ExceptionListItemSchema) => void;
}

export const useExceptionItemCard = ({
  listType,
  editActionLabel,
  deleteActionLabel,
  exceptionItem,
  getFormattedComments,
  onEditException,
  onDeleteException,
}: UseExceptionItemCardProps) => {
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
        label: deleteActionLabel || i18n.exceptionItemCardDeleteButton(listType),
        onClick: handleDelete,
      },
    ],
    [editActionLabel, listType, deleteActionLabel, handleDelete, handleEdit]
  );
  return {
    actions,
    formattedComments,
  };
};
