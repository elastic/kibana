/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiComment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SystemMessageProps {
  content: React.ReactNode;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ content }) => {
  return (
    <EuiComment
      username={i18n.translate('playground.chat.message.system.username', {
        defaultMessage: 'system',
      })}
      timelineAvatarAriaLabel={i18n.translate('playground.chat.message.system.avatarAriaLabel', {
        defaultMessage: 'System',
      })}
      event={content}
      timelineAvatar="dot"
      eventColor="subdued"
    />
  );
};
