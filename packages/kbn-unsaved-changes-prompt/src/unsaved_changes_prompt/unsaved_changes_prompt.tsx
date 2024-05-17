/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { Prompt } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

const DEFAULT_MESSAGE_TEXT = i18n.translate('unsavedChangesPrompt.defaultModalText', {
  defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
});

interface Props {
  hasUnsavedChanges: boolean;
  messageText?: string;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({
  hasUnsavedChanges,
  messageText = DEFAULT_MESSAGE_TEXT,
}) => {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Prevent event from bubbling
        event.preventDefault();
        // For legacy support, e.g. Chrome/Edge < 119
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  return <Prompt when={hasUnsavedChanges} message={messageText} />;
};
