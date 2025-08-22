/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiToolTip, copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  relativePath: string;
}

export const CopyRelativePathButton = ({ relativePath }: Props) => {
  const [isTextCopied, setTextCopied] = useState(false);

  const onClick = () => {
    copyToClipboard(relativePath);
    setTextCopied(true);
  };

  const onBlur = () => {
    setTextCopied(false);
  };

  return (
    <EuiToolTip
      content={
        isTextCopied
          ? i18n.translate(
              'kbnInspectComponent.inspectFlyout.linksSection.copyRelativeFilePathCopiedTooltip',
              { defaultMessage: 'Relative file path copied' }
            )
          : i18n.translate(
              'kbnInspectComponent.inspectFlyout.linksSection.copyRelativeFilePathActionTooltip',
              { defaultMessage: 'Copy relative file path' }
            )
      }
    >
      <EuiButtonIcon
        aria-label={i18n.translate(
          'kbnInspectComponent.inspectFlyout.linksSection.copyFileNameAriaLabel',
          {
            defaultMessage: 'Copy file name',
          }
        )}
        color="text"
        iconType="copy"
        onClick={onClick}
        onBlur={onBlur}
      />
    </EuiToolTip>
  );
};
