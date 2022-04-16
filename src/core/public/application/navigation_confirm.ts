/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OverlayStart } from '..';

export type ConfirmHandlerCallback = (result: boolean) => void;
export type ConfirmHandler = (message: string, callback: ConfirmHandlerCallback) => void;

interface GetUserConfirmationHandlerParams {
  overlayPromise: Promise<OverlayStart>;
  fallbackHandler?: ConfirmHandler;
}

export const getUserConfirmationHandler = ({
  overlayPromise,
  fallbackHandler = windowConfirm,
}: GetUserConfirmationHandlerParams): ConfirmHandler => {
  let overlayConfirm: ConfirmHandler;

  overlayPromise.then(
    (overlay) => {
      overlayConfirm = getOverlayConfirmHandler(overlay);
    },
    () => {
      // should never append, but even if it does, we don't need to do anything,
      // and will just use the default window confirm instead
    }
  );

  return (message: string, callback: ConfirmHandlerCallback) => {
    if (overlayConfirm) {
      overlayConfirm(message, callback);
    } else {
      fallbackHandler(message, callback);
    }
  };
};

const windowConfirm: ConfirmHandler = (message: string, callback: ConfirmHandlerCallback) => {
  const confirmed = window.confirm(message);
  callback(confirmed);
};

const getOverlayConfirmHandler = (overlay: OverlayStart): ConfirmHandler => {
  return (message: string, callback: ConfirmHandlerCallback) => {
    overlay
      .openConfirm(message, { title: ' ', 'data-test-subj': 'navigationBlockConfirmModal' })
      .then(
        (confirmed) => {
          callback(confirmed);
        },
        () => {
          callback(false);
        }
      );
  };
};
