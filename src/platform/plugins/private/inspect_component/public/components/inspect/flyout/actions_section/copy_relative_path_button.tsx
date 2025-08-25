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

const COPIED_RELATIVE_PATH = i18n.translate(
  'kbnInspectComponent.inspectFlyout.actionsSection.copyRelativeFilePathCopiedTooltip',
  { defaultMessage: 'Relative file path copied' }
);

const COPY_RELATIVE_PATH = i18n.translate(
  'kbnInspectComponent.inspectFlyout.actionsSection.copyRelativeFilePathActionTooltip',
  { defaultMessage: 'Copy relative file path' }
);

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
    <EuiToolTip content={isTextCopied ? COPIED_RELATIVE_PATH : COPY_RELATIVE_PATH}>
      <EuiButtonIcon
        aria-label={COPY_RELATIVE_PATH}
        color="text"
        iconType="copy"
        onClick={onClick}
        onBlur={onBlur}
        data-test-subj="inspectCopyRelativePathButton"
      />
    </EuiToolTip>
  );
};
