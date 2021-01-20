/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
        title={i18n.translate('dashboard.topNav.showCloneModal.dashboardCopyTitle', {
          defaultMessage: '{title} Copy',
          values: { title },
        })}
      />
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
