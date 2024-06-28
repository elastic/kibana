/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiButtonEmpty,
  EuiTextBlockTruncate,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

const MAX_VISIBLE_LENGTH = 110;

export interface FieldDescriptionContentProps {
  field: {
    name: string;
    customDescription?: string;
  };
  color?: 'subdued';
  truncate?: boolean;
  Wrapper?: React.FC<{ children: React.ReactNode }>;
}

export interface FieldDescriptionProps extends FieldDescriptionContentProps {
  fieldsMetadataService?: FieldsMetadataPublicStart;
  isEcsField?: boolean;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  fieldsMetadataService,
  isEcsField,
  ...props
}) => {
  if (fieldsMetadataService && isEcsField && !props.field.customDescription) {
    return <EcsFieldDescriptionFallback fieldsMetadataService={fieldsMetadataService} {...props} />;
  }

  return <FieldDescriptionContent {...props} />;
};

const EcsFieldDescriptionFallback: React.FC<
  FieldDescriptionProps & { fieldsMetadataService: FieldsMetadataPublicStart }
> = ({ fieldsMetadataService, ...props }) => {
  const { fieldsMetadata, loading } = fieldsMetadataService.useFieldsMetadata({
    attributes: ['description'],
    fieldNames: [props.field.name],
  });

  const escFieldDescription = fieldsMetadata?.[props.field.name]?.description;

  return (
    <EuiSkeletonText isLoading={loading} size="s">
      <FieldDescriptionContent
        {...props}
        field={{
          ...props.field,
          customDescription: escFieldDescription ? `ECS: ${escFieldDescription}` : undefined,
        }}
      />
    </EuiSkeletonText>
  );
};

export const FieldDescriptionContent: React.FC<FieldDescriptionContentProps> = ({
  field,
  color,
  truncate = true,
  Wrapper,
}) => {
  const { euiTheme } = useEuiTheme();
  const customDescription = (field?.customDescription || '').trim();
  const isTooLong = Boolean(truncate && customDescription.length > MAX_VISIBLE_LENGTH);
  const [isTruncated, setIsTruncated] = useState<boolean>(isTooLong);

  if (!customDescription) {
    return null;
  }

  const result = (
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
            <EuiTextBlockTruncate lines={2}>{customDescription}</EuiTextBlockTruncate>
          </button>
        </EuiText>
      ) : (
        <>
          <EuiText color={color} size="xs" className="eui-textBreakWord eui-textLeft">
            {customDescription}
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

  return Wrapper ? <Wrapper>{result}</Wrapper> : result;
};
