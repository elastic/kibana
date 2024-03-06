/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiTextProps, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';

const MAX_VISIBLE_LENGTH = 110;

export interface FieldDescriptionProps {
  field: {
    name: string;
    customDescription?: string;
  };
  color?: EuiTextProps['color'];
  truncate?: boolean;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  field,
  color,
  truncate = true,
}) => {
  const customDescription = (field?.customDescription || '').trim();
  const isTooLong = Boolean(truncate && customDescription.length > MAX_VISIBLE_LENGTH);
  const [isTruncated, setIsTruncated] = useState<boolean>(isTooLong);

  if (!customDescription) {
    return null;
  }

  return (
    <EuiText data-test-subj={`fieldDescription-${field.name}`} color={color} size="xs">
      <span
        className="eui-textBreakWord"
        css={css`
          display: ${isTruncated ? 'inline' : 'block'};
        `}
      >
        {isTruncated
          ? customDescription.slice(0, MAX_VISIBLE_LENGTH).trim() + '… '
          : customDescription}
      </span>
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
    </EuiText>
  );
};
