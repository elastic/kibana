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
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { DashboardCloneModal } from './clone_modal';

export function showCloneModal(
  onClone: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<{ id?: string } | { error: Error }>,
  title: string
) {
  const container = document.createElement('div');
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };

  const onCloneConfirmed = async (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => {
    onClone(newTitle, isTitleDuplicateConfirmed, onTitleDuplicate).then(
      (response: { id?: string } | { error: Error }) => {
        // The only time you don't want to close the modal is if it's asking you
        // to confirm a duplicate title, in which case there will be no error and no id.
        if ((response as { error: Error }).error || (response as { id?: string }).id) {
          closeModal();
        }
      }
    );
  };
  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <DashboardCloneModal
        onClone={onCloneConfirmed}
        onClose={closeModal}
        title={i18n.translate('kbn.dashboard.topNav.showCloneModal.dashboardCopyTitle', {
          defaultMessage: '{title} Copy',
          values: { title },
        })}
      />
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
