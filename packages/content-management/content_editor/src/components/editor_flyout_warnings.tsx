/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const getI18nTexts = () => ({
  title: i18n.translate('contentManagement.contentEditor.flyoutWarningsTitle', {
    defaultMessage: 'Proceed with caution!',
  }),
});

export const ContentEditorFlyoutWarningsCallOut = ({
  warningMessages,
}: {
  warningMessages?: string[];
}) => {
  const i18nTexts = useMemo(() => getI18nTexts(), []);

  return warningMessages?.length ? (
    <>
      <EuiCallOut title={i18nTexts.title} color="warning">
        <ul>
          {warningMessages.map((message) => (
            <li>{message}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  ) : null;
};
