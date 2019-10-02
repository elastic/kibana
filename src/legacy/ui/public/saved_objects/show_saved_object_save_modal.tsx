/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';

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

export interface MinimalSaveModalProps {
  onSave: (...args: any[]) => Promise<SaveResult>;
  onClose: () => void;
}

export function showSaveModal(saveModal: React.ReactElement<MinimalSaveModalProps>) {
  const container = document.createElement('div');
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
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

  ReactDOM.render(<I18nContext>{element}</I18nContext>, container);
}
