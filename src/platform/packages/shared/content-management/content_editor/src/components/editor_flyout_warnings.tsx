/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
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
      <KbnWarningCallout announceOnMount={false} title={i18nTexts.title}>
        <ul>
          {warningMessages.map((message) => (
            <li>{message}</li>
          ))}
        </ul>
      </KbnWarningCallout>
      <EuiSpacer />
    </>
  ) : null;
};
