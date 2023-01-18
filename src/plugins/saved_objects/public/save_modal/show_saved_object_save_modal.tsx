/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Observable } from 'rxjs';
import { I18nStart } from '@kbn/core/public';
import type { CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

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
  I18nContext: I18nStart['Context'],
  theme$: Observable<CoreTheme>,
  Wrapper?: React.FC
) {
  const container = document.createElement('div');
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    saveModal.props.onClose?.();
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
  document.body.appendChild(container);
  const element = React.cloneElement(saveModal, {
    onSave: onSaveConfirmed,
    onClose: closeModal,
  });

  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <I18nContext>
        {Wrapper ? <Wrapper>{element}</Wrapper> : element}
      </I18nContext>
    </KibanaThemeProvider>,
    container
  );
}
