/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '../../doc_views/doc_views_types';

export function JsonCodeBlock({ hit }: DocViewRenderProps) {
  const label = i18n.translate('discover.docViews.json.codeEditorAriaLabel', {
    defaultMessage: 'Read only JSON view of an elasticsearch document',
  });
  return (
    <EuiCodeBlock aria-label={label} language="json" isCopyable paddingSize="s">
      {JSON.stringify(hit, null, 2)}
    </EuiCodeBlock>
  );
}
