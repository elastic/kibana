/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { DataErrorsControl } from '../types';

export function DataErrorsSwitch({
  dataErrorsControl,
  closePopover,
}: {
  dataErrorsControl: DataErrorsControl;
  closePopover: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { onChange: onChangeDataErrors, enabled: dataErrorsEnabled } = dataErrorsControl;

  const onChangeDataErrorsSwitch = useCallback(() => {
    onChangeDataErrors(!dataErrorsEnabled);
    closePopover();
  }, [onChangeDataErrors, dataErrorsEnabled, closePopover]);

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        padding: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexItem>
        <EuiSwitch
          compressed
          checked={dataErrorsEnabled}
          onChange={onChangeDataErrorsSwitch}
          label={
            <EuiText size="xs">
              <FormattedMessage
                id="esqlEditor.query.dataErrorsLabel"
                defaultMessage="Highlight data errors"
              />
            </EuiText>
          }
          data-test-subj="ESQLEditor-footerPopover-dataErrorsSwitch"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
