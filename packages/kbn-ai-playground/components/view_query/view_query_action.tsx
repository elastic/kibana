/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiLink,
  EuiButton,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../../types';
import { useIndicesFields } from '../../hooks/useIndicesFields';
import { createQuery, getDefaultQueryFields } from '../../lib/create_query';

interface ViewQueryActionProps {}

export const ViewQueryAction: React.FC<ViewQueryActionProps> = () => {
  const { getValues } = useFormContext<ChatForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices: string[] = getValues('indices');
  const { fields } = useIndicesFields(selectedIndices || []);
  const defaultFields = useMemo(() => getDefaultQueryFields(fields), [fields]);
  const [queryFields, setQueryFields] = useState(defaultFields);

  const {
    field: { onChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
    defaultValue: {},
  });

  useEffect(() => {
    if (selectedIndices?.length > 0) {
      setQueryFields(defaultFields);
    }
  }, [selectedIndices, defaultFields]);

  const isQueryFieldSelected = (index: string, field: string) => {
    return queryFields[index].includes(field);
  };

  const toggleQueryField = (index: string, field: string) => {
    if (isQueryFieldSelected(index, field)) {
      setQueryFields({
        ...queryFields,
        [index]: queryFields[index].filter((x: string) => x !== field),
      });
    } else {
      setQueryFields({
        ...queryFields,
        [index]: [...queryFields[index], field],
      });
    }
  };

  const saveQuery = () => {
    onChange(createQuery(queryFields, fields));
    setShowFlyout(false);
  };

  let flyout;

  if (showFlyout) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setShowFlyout(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>View Query</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
                {JSON.stringify(createQuery(queryFields, fields), null, 2)}
              </EuiCodeBlock>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              {Object.keys(fields).map((index: string) => {
                const group = fields[index];
                return (
                  <>
                    <h2>{index}</h2>
                    <br />
                    {[...group.elser_query_fields, ...group.dense_vector_query_fields].map(
                      (field) => {
                        return (
                          <EuiLink
                            onClick={() => toggleQueryField(index, field.field)}
                            color={isQueryFieldSelected(index, field.field) ? 'primary' : 'text'}
                          >
                            {field.field} ({field.model_id})
                          </EuiLink>
                        );
                      }
                    )}
                    {group.bm25_query_fields.map((field) => {
                      return (
                        <EuiLink
                          onClick={() => toggleQueryField(index, field)}
                          color={isQueryFieldSelected(index, field) ? 'primary' : 'text'}
                        >
                          {field}
                        </EuiLink>
                      );
                    })}
                  </>
                );
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonEmpty onClick={() => setShowFlyout(false)}>Close</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton onClick={saveQuery}>Save</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <>
      {flyout}
      {selectedIndices?.length > 0 && (
        <EuiButtonEmpty onClick={() => setShowFlyout(true)}>View Query</EuiButtonEmpty>
      )}
    </>
  );
};
