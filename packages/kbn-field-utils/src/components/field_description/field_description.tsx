/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';
import {
  EuiText,
  EuiButtonEmpty,
  EuiTextBlockTruncate,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const SHOULD_TRUNCATE_FIELD_DESCRIPTION_BY_DEFAULT = true;
export const SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY =
  'fieldDescription:truncateByDefault';

const MAX_VISIBLE_LENGTH = 110;

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export interface FieldDescriptionContentProps {
  field: {
    name: string;
    customDescription?: string;
    type: string;
  };
  color?: 'subdued';
  truncate?: boolean;
  Wrapper?: React.FC<{ children: React.ReactNode }>;
}

export interface FieldDescriptionProps extends FieldDescriptionContentProps {
  fieldsMetadataService?: FieldsMetadataPublicStart;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  fieldsMetadataService,
  ...props
}) => {
  if (fieldsMetadataService && !props.field.customDescription) {
    return <EcsFieldDescriptionFallback fieldsMetadataService={fieldsMetadataService} {...props} />;
  }

  return <FieldDescriptionContent {...props} />;
};

const EcsFieldDescriptionFallback: React.FC<
  FieldDescriptionProps & { fieldsMetadataService: FieldsMetadataPublicStart }
> = ({ fieldsMetadataService, ...props }) => {
  const fieldName = removeKeywordSuffix(props.field.name);
  const { fieldsMetadata, loading } = fieldsMetadataService.useFieldsMetadata({
    attributes: ['description', 'type'],
    fieldNames: [fieldName],
  });

  const escFieldDescription = fieldsMetadata?.[fieldName]?.description;
  const escFieldType = fieldsMetadata?.[fieldName]?.type;

  return (
    <EuiSkeletonText isLoading={loading} size="s">
      <FieldDescriptionContent
        {...props}
        ecsFieldDescription={
          escFieldType && esFieldTypeToKibanaFieldType(escFieldType) === props.field.type
            ? escFieldDescription
            : undefined
        }
      />
    </EuiSkeletonText>
  );
};

export const FieldDescriptionContent: React.FC<
  FieldDescriptionContentProps & { ecsFieldDescription?: string }
> = ({ field, color, truncate = true, ecsFieldDescription, Wrapper }) => {
  const [shouldTruncateByDefault, setShouldTruncateByDefault] = useLocalStorage<boolean>(
    SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY,
    SHOULD_TRUNCATE_FIELD_DESCRIPTION_BY_DEFAULT
  );
  const { euiTheme } = useEuiTheme();
  const customDescription = (field?.customDescription || ecsFieldDescription || '').trim();
  const isTooLong = Boolean(truncate && customDescription.length > MAX_VISIBLE_LENGTH);
  const [isTruncated, setIsTruncated] = useState<boolean>(
    (shouldTruncateByDefault ?? SHOULD_TRUNCATE_FIELD_DESCRIPTION_BY_DEFAULT) && isTooLong
  );

  const truncateFieldDescription = useCallback(
    (nextValue) => {
      setIsTruncated(nextValue);
      setShouldTruncateByDefault(nextValue);
    },
    [setIsTruncated, setShouldTruncateByDefault]
  );

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
            onClick={() => truncateFieldDescription(false)}
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
            <EuiTextBlockTruncate lines={2}>
              <Markdown readOnly>{customDescription}</Markdown>
            </EuiTextBlockTruncate>
          </button>
        </EuiText>
      ) : (
        <>
          <EuiText color={color} size="xs" className="eui-textBreakWord eui-textLeft">
            <Markdown readOnly>{customDescription}</Markdown>
          </EuiText>
          {isTooLong && (
            <EuiButtonEmpty
              size="xs"
              flush="both"
              data-test-subj={`toggleFieldDescription-${field.name}`}
              onClick={() => truncateFieldDescription(true)}
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
