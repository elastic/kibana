/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const SmartFieldFallbackTooltip: React.FC<{
  associatedSmartFields: string;
}> = ({ associatedSmartFields }) => {
  return (
    <EuiIconTip
      anchorProps={{ 'data-test-subj': 'smartFieldFallbackTooltipIcon' }}
      content={i18n.translate('unifiedFieldList.smartFieldFallbackTooltip', {
        defaultMessage: 'Forms part of the following Smart Fields: {smartFields}',
        values: { smartFields: associatedSmartFields },
      })}
      position="bottom"
      type="questionInCircle"
      size="s"
    />
  );
};

// For lazy import
// eslint-disable-next-line import/no-default-export
export default SmartFieldFallbackTooltip;
