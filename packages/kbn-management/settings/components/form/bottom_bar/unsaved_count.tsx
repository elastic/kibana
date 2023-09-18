/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormStyles } from '../form.styles';

interface UnsavedCountProps {
  unsavedCount: number;
}

export const UnsavedCount = ({ unsavedCount }: UnsavedCountProps) => {
  const { cssFormUnsavedCountMessage } = useFormStyles();
  return (
    <p id="aria-describedby.countOfUnsavedSettings">
      <EuiTextColor css={cssFormUnsavedCountMessage} color="ghost">
        <FormattedMessage
          id="advancedSettings.form.countOfSettingsChanged"
          defaultMessage="{unsavedCount} unsaved {unsavedCount, plural,
              one {setting}
              other {settings}
            }"
          values={{
            unsavedCount,
          }}
        />
      </EuiTextColor>
    </p>
  );
};
