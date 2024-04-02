/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiButtonEmpty, EuiTextBlockTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
const MAX_VISIBLE_LENGTH = 110;

export interface FieldDescriptionProps {
  field: {
    name: string;
    description?: string;
  };
  color?: 'subdued';
  truncate?: boolean;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  field,
  color,
  truncate = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const description = (field?.description || '').trim();

  const isTooLong = Boolean(truncate && description.length > MAX_VISIBLE_LENGTH);
  const [isTruncated, setIsTruncated] = useState<boolean>(isTooLong);

  if (!description) {
    return null;
  }

  return (
    <div data-test-subj={`fieldDescription-${field.name}`}>
      {isTruncated ? (
        <EuiText color={color} size="xs" className="eui-textBreakWord eui-textLeft">
          <button
            data-test-subj={`toggleFieldDescription-${field.name}`}
            title={i18n.translate('fieldUtils.fieldDescription.viewMoreButton', {
              defaultMessage: 'View full field description',
            })}
            className="eui-textBreakWord eui-textLeft"
            onClick={() => setIsTruncated(false)}
            css={css`
              padding: 0;
              margin: 0;
              color: ${color === 'subdued' ? euiTheme.colors.subduedText : euiTheme.colors.text};
              line-height: inherit;
              font-size: inherit;

              &:hover,
              &:active,
              &:focus {
                color: ${euiTheme.colors.link};
              }
            `}
          >
            <EuiTextBlockTruncate lines={2}>{description}</EuiTextBlockTruncate>
          </button>
        </EuiText>
      ) : (
        <>
          <EuiText color={color} size="xs" className="eui-textBreakWord eui-textLeft">
            {description}
          </EuiText>
          {isTooLong && (
            <EuiButtonEmpty
              size="xs"
              flush="both"
              data-test-subj={`toggleFieldDescription-${field.name}`}
              onClick={() => setIsTruncated(true)}
            >
              {i18n.translate('fieldUtils.fieldDescription.viewLessButton', {
                defaultMessage: 'View less',
              })}
            </EuiButtonEmpty>
          )}
        </>
      )}
    </div>
  );
};
