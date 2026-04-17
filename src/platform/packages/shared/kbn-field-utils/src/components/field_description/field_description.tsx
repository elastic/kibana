/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Markdown } from '@kbn/shared-ux-markdown';
import {
  EuiText,
  EuiButtonEmpty,
  EuiTextBlockTruncate,
  EuiSkeletonText,
  useEuiTheme,
  EuiSpacer,
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
  streamNames?: string[];
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  fieldsMetadataService,
  streamNames,
  ...props
}) => {
  if (fieldsMetadataService && !props.field.customDescription) {
    const fieldName = removeKeywordSuffix(props.field.name);
    return (
      <>
        <EcsFieldDescriptionFallback fieldsMetadataService={fieldsMetadataService} {...props} />
        {streamNames?.length ? (
          <StreamsFieldDescriptionFallback
            fieldName={fieldName}
            streamNames={streamNames}
            fieldsMetadataService={fieldsMetadataService}
            color={props.color}
            truncate={props.truncate}
          />
        ) : null}
      </>
    );
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
        description={
          escFieldType && esFieldTypeToKibanaFieldType(escFieldType) === props.field.type
            ? escFieldDescription
            : undefined
        }
      />
    </EuiSkeletonText>
  );
};

const StreamsFieldDescriptionFallback: React.FC<{
  fieldName: string;
  streamNames: string[];
  fieldsMetadataService: FieldsMetadataPublicStart;
  color?: 'subdued';
  truncate?: boolean;
}> = ({ fieldName, streamNames, fieldsMetadataService, color, truncate }) => {
  const { streamFieldsMetadata, loading } = fieldsMetadataService.useFieldsMetadata({
    attributes: ['description'],
    fieldNames: [fieldName],
    streamNames,
    source: ['streams'],
  });

  return (
    <EuiSkeletonText isLoading={loading} size="s">
      {streamNames.map((streamName) => {
        const description = streamFieldsMetadata?.[streamName]?.[fieldName]?.description;
        if (!description) return null;
        return (
          <React.Fragment key={streamName}>
            <EuiSpacer size="s" />
            <EuiText size="xs" className="eui-textBreakWord eui-textLeft">
              <FormattedMessage
                id="fieldUtils.fieldDescription.perStreamLabel"
                defaultMessage="Per {streamName} stream:"
                values={{ streamName: <strong>{streamName}</strong> }}
              />
            </EuiText>
            <FieldDescriptionContent
              field={{ name: fieldName, type: '' }}
              description={description}
              color={color}
              truncate={truncate}
            />
          </React.Fragment>
        );
      })}
    </EuiSkeletonText>
  );
};

export const FieldDescriptionContent: React.FC<
  FieldDescriptionContentProps & { description?: string }
> = ({ field, color, truncate = true, description, Wrapper }) => {
  const [shouldTruncateByDefault, setShouldTruncateByDefault] = useLocalStorage<boolean>(
    SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY,
    SHOULD_TRUNCATE_FIELD_DESCRIPTION_BY_DEFAULT
  );
  const { euiTheme } = useEuiTheme();
  const customDescription = (field?.customDescription || description || '').trim();
  const isTooLong = Boolean(truncate && customDescription.length > MAX_VISIBLE_LENGTH);
  const [isTruncated, setIsTruncated] = useState<boolean>(
    (shouldTruncateByDefault ?? SHOULD_TRUNCATE_FIELD_DESCRIPTION_BY_DEFAULT) && isTooLong
  );

  const truncateFieldDescription = useCallback(
    (nextValue: boolean) => {
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
              display: block;
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
