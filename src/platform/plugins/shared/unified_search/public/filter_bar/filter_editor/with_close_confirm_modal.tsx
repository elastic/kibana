/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareFilters, Filter } from '@kbn/es-query';
import React, { FC, useCallback, useState } from 'react';
import { CloseFilterEditorConfirmModal } from './close_confirm_modal';

interface QueryDslFilter {
  queryDsl: string;
  customLabel: string | null;
}

interface OriginalFilter {
  filter: Filter;
  queryDslFilter: QueryDslFilter;
}

type ChangedFilter = Filter | QueryDslFilter;

export interface WithCloseFilterEditorConfirmModalProps {
  onCloseFilterPopover: (actions?: Action[]) => void;
  onLocalFilterCreate: (filter: OriginalFilter) => void;
  onLocalFilterUpdate: (filter: ChangedFilter) => void;
}

type Action = () => void;

const isQueryDslFilter = (filter: Filter | QueryDslFilter): filter is QueryDslFilter => {
  return 'queryDsl' in filter && 'customLabel' in filter;
};

const isQueryDslFilterChanged = (original: QueryDslFilter, updated: QueryDslFilter) =>
  original.queryDsl !== updated.queryDsl || original.customLabel !== updated.customLabel;

export function withCloseFilterEditorConfirmModal<
  T extends WithCloseFilterEditorConfirmModalProps = WithCloseFilterEditorConfirmModalProps
>(WrappedComponent: FC<T>) {
  return function (props: Omit<T, keyof WithCloseFilterEditorConfirmModalProps>) {
    const [actionsOnClose, setActionsOnClose] = useState<Action[]>();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [updatedFilter, setUpdatedFilter] = useState<ChangedFilter>();
    const [originalFilter, setOriginalFilter] = useState<OriginalFilter>();

    const onCancelModal = useCallback(() => {
      setShowConfirmModal(false);
    }, [setShowConfirmModal]);

    const onConfirmModal = useCallback(() => {
      setShowConfirmModal(false);
      actionsOnClose?.map((action) => action());
    }, [actionsOnClose, setShowConfirmModal]);

    const onCloseFilterPopover = useCallback(
      (actions?: Action[]) => {
        const filtersAreNotEqual =
          updatedFilter &&
          originalFilter &&
          ((isQueryDslFilter(updatedFilter) &&
            isQueryDslFilterChanged(originalFilter.queryDslFilter, updatedFilter)) ||
            (!isQueryDslFilter(updatedFilter) &&
              !compareFilters(originalFilter.filter, updatedFilter, {
                index: true,
                alias: true,
              })));
        if (filtersAreNotEqual) {
          setShowConfirmModal(true);
          setActionsOnClose(actions);
        } else {
          actions?.map((action) => action());
        }
      },
      [originalFilter, updatedFilter, setShowConfirmModal, setActionsOnClose]
    );

    return (
      <>
        <WrappedComponent
          {...(props as T)}
          onCloseFilterPopover={onCloseFilterPopover}
          onLocalFilterCreate={setOriginalFilter}
          onLocalFilterUpdate={setUpdatedFilter}
        />
        {showConfirmModal && (
          <CloseFilterEditorConfirmModal onCancel={onCancelModal} onConfirm={onConfirmModal} />
        )}
      </>
    );
  };
}
