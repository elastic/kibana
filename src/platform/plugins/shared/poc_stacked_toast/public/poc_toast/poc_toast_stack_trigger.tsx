/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const triggerLabel = i18n.translate('pocStackedToast.stackTrigger', {
  defaultMessage: 'Add random POC toast',
});

export const PocToastStackTrigger = ({ onAdd }: { onAdd: () => void }) => (
  <EuiHeaderSectionItemButton
    aria-label={triggerLabel}
    title={triggerLabel}
    data-test-subj="pocToastStackTrigger"
    onClick={onAdd}
  >
    <EuiIcon type="bell" size="m" aria-hidden />
  </EuiHeaderSectionItemButton>
);
