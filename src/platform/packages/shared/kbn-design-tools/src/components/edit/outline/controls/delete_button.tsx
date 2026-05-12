/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onClick: () => void;
}

export const DeleteButton = ({ onClick }: Props) => (
  <EuiButtonIcon
    iconType="trash"
    color="danger"
    size="xs"
    aria-label={i18n.translate('kbnDesignTools.editOutline.deleteElement', {
      defaultMessage: 'Delete element',
    })}
    onClick={onClick}
    data-test-subj="editOutlineDeleteButton"
  />
);
