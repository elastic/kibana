/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import moment from 'moment';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { IClickActionDescriptor } from './types';
import type { OnActionDismiss } from './types';
import extendSessionIcon from './icons/extend_session.svg';
import type { UISession } from '../../../types';
interface ExtendButtonProps {
  searchSession: UISession;
  api: SearchSessionsMgmtAPI;
}

const ExtendConfirm = ({ ...props }: ExtendButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { searchSession, api, onActionDismiss } = props;
  const { id, name, expires } = searchSession;
  const [isLoading, setIsLoading] = useState(false);
  const extendByDuration = moment.duration(api.getExtendByDuration());

  const newExpiration = moment(expires).add(extendByDuration);

  const confirmModalTitleId = useGeneratedHtmlId();
  const title = i18n.translate('data.mgmt.searchSessions.extendModal.backgroundSearchTitle', {
    defaultMessage: 'Extend background search expiration',
  });

  const confirm = i18n.translate('data.mgmt.searchSessions.extendModal.extendButton', {
    defaultMessage: 'Extend expiration',
  });
  const extend = i18n.translate('data.mgmt.searchSessions.extendModal.dontExtendButton', {
    defaultMessage: 'Cancel',
  });
  const message = i18n.translate('data.mgmt.searchSessions.extendModal.backgroundSearchMessage', {
    defaultMessage:
      "The background search ''{name}'' expiration would be extended until {newExpires}.",
    values: {
      name,
      newExpires: newExpiration.toLocaleString(),
    },
  });

  return (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      title={title}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onActionDismiss}
      onConfirm={async () => {
        setIsLoading(true);
        await api.sendExtend(id, `${newExpiration.toISOString()}`);
        setIsLoading(false);
        onActionDismiss();
      }}
      confirmButtonText={confirm}
      confirmButtonDisabled={isLoading}
      cancelButtonText={extend}
      defaultFocusedButton="confirm"
      buttonColor="primary"
    >
      {message}
    </EuiConfirmModal>
  );
};

export const createExtendActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: extendSessionIcon,
  label: <FormattedMessage id="data.mgmt.searchSessions.actionExtend" defaultMessage="Extend" />,
  onClick: async () => {
    const ref = core.overlays.openModal(
      toMountPoint(
        <ExtendConfirm onActionDismiss={() => ref?.close()} searchSession={uiSession} api={api} />,
        core
      )
    );
    await ref.onClose;
  },
});
