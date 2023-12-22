/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiButtonEmpty } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';

const MAX_VISIBLE_LENGTH = 140;

export interface FieldDescriptionProps {
  field: DataViewField;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({ field }) => {
  const customDescription = (field?.customDescription || '').trim();
  const isTooLong = customDescription.length > MAX_VISIBLE_LENGTH;
  const [isTruncated, setIsTruncated] = useState<boolean>(isTooLong);

  if (!customDescription) {
    return null;
  }

  return (
    <div>
      <EuiText
        data-test-subj={`fieldDescription-${field.name}`}
        size="s"
        className="eui-textBreakWord"
      >
        {isTruncated
          ? customDescription.slice(0, MAX_VISIBLE_LENGTH).trim() + '…'
          : customDescription}
      </EuiText>
      {isTooLong && (
        <EuiButtonEmpty
          key={String(isTruncated)}
          size="xs"
          flush="both"
          data-test-subj={`toggleFieldDescription-${field.name}`}
          onClick={() => setIsTruncated(!isTruncated)}
        >
          {isTruncated
            ? i18n.translate('fieldUtils.fieldDescription.viewMoreButton', {
                defaultMessage: 'View more',
              })
            : i18n.translate('fieldUtils.fieldDescription.viewLessButton', {
                defaultMessage: 'View less',
              })}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
