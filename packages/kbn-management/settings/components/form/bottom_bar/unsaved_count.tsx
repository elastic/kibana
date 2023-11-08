/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormStyles } from '../form.styles';

/**
 * Props for a {@link UnsavedCount} component.
 */
interface UnsavedCountProps {
  unsavedCount: number;
}

/**
 * Component for displaying the count of unsaved changes in a {@link BottomBar}.
 */
export const UnsavedCount = ({ unsavedCount }: UnsavedCountProps) => {
  const { cssFormUnsavedCountMessage } = useFormStyles();
  return (
    <EuiText size="s" css={cssFormUnsavedCountMessage}>
      <FormattedMessage
        id="management.settings.form.countOfSettingsChanged"
        defaultMessage="{unsavedCount} unsaved {unsavedCount, plural,
              one {setting}
              other {settings}
            }"
        values={{
          unsavedCount,
        }}
      />
    </EuiText>
  );
};
