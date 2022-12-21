/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compareFilters, Filter, FILTERS } from '@kbn/es-query';
import React, { FC, useCallback, useState } from 'react';
import { CloseFilterEditorConfirmModal } from './close_confirm_modal';

export interface WithCloseFilterEditorConfirmModalProps {
  onCloseFilterPopover: (
    current?: Filter | Filter[],
    updated?: Filter | Filter[],
    actions?: Action[]
  ) => void;
}

type Action = () => void;

export function withCloseFilterEditorConfirmModal<
  T extends WithCloseFilterEditorConfirmModalProps = WithCloseFilterEditorConfirmModalProps
>(WrappedComponent: FC<T>) {
  return function (props: Omit<T, keyof WithCloseFilterEditorConfirmModalProps>) {
    const [actionsOnClose, setActionsOnClose] = useState<Action[]>();
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const onCancelModal = useCallback(() => {
      setShowConfirmModal(false);
    }, [setShowConfirmModal]);

    const onConfirmModal = useCallback(() => {
      setShowConfirmModal(false);
      actionsOnClose?.map((action) => action());
    }, [actionsOnClose, setShowConfirmModal]);

    const onCloseFilterPopover = useCallback(
      (current: Filter, updated: Filter, actions?: Action[]) => {
        if (
          !compareFilters(current, updated, {
            index: true,
            alias: true,
          }) ||
          updated.meta.type === FILTERS.CUSTOM // show always if Query DSL mode is enabled
        ) {
          setShowConfirmModal(true);
          setActionsOnClose(actions);
        } else {
          actions?.map((action) => action());
        }
      },
      [setShowConfirmModal, setActionsOnClose]
    );

    return (
      <>
        <WrappedComponent {...(props as T)} onCloseFilterPopover={onCloseFilterPopover} />
        {showConfirmModal && (
          <CloseFilterEditorConfirmModal onCancel={onCancelModal} onConfirm={onConfirmModal} />
        )}
      </>
    );
  };
}
