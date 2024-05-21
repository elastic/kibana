/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  associatedSmartFields: string;
}

export const SmartFieldFallbackTooltip: React.FC<Props> = ({ associatedSmartFields }) => {
  return (
    <EuiToolTip
      position="bottom"
      content={i18n.translate('unifiedFieldList.smartFieldFallbackTooltip', {
        defaultMessage: 'Forms part of the following Smart Fields: {smartFields}',
        values: { smartFields: associatedSmartFields },
      })}
    >
      <EuiIcon
        size="s"
        tabIndex={0}
        type="questionInCircle"
        title={i18n.translate('unifiedFieldList.smartFieldFallbackTooltipIcon', {
          defaultMessage: 'Smart Fields information',
        })}
      />
    </EuiToolTip>
  );
};
