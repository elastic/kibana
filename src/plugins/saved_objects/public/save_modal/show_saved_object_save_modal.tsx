/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';
import { getAnalytics, getI18n, getTheme } from '../kibana_services';

/**
 * Represents the result of trying to persist the saved object.
 * Contains `error` prop if something unexpected happened (e.g. network error).
 * Contains an `id` if persisting was successful. If `id` and
 * `error` are undefined, persisting was not successful, but the
 * modal can still recover (e.g. the name of the saved object was already taken).
 */
export type SaveResult = { id?: string } | { error: Error };

function isSuccess(result: SaveResult): result is { id?: string } {
  return 'id' in result;
}

interface MinimalSaveModalProps {
  onSave: (...args: any[]) => Promise<SaveResult>;
  onClose: () => void;
}

export function showSaveModal(
  saveModal: React.ReactElement<MinimalSaveModalProps>,
  Wrapper?: FC<PropsWithChildren<unknown>>
) {
  // initialize variable that will hold reference for unmount
  // eslint-disable-next-line prefer-const
  let unmount: ReturnType<ReturnType<typeof toMountPoint>>;

  const mount = toMountPoint(
    React.createElement(function createSavedObjectModal() {
      const closeModal = () => {
        unmount();
        // revert control back to caller after cleaning up modal
        setTimeout(() => {
          saveModal.props.onClose?.();
        }, 0);
      };

      const onSave = saveModal.props.onSave;

      const onSaveConfirmed: MinimalSaveModalProps['onSave'] = async (...args) => {
        const response = await onSave(...args);
        // close modal if we either hit an error or the saved object got an id
        if (Boolean(isSuccess(response) ? response.id : response.error)) {
          closeModal();
        }
        return response;
      };

      const augmentedElement = React.cloneElement(saveModal, {
        onSave: onSaveConfirmed,
        onClose: closeModal,
      });

      return React.createElement(Wrapper ?? React.Fragment, {
        children: augmentedElement,
      });
    }),
    { analytics: getAnalytics(), theme: getTheme(), i18n: getI18n() }
  );

  unmount = mount(document.createElement('div'));
}
