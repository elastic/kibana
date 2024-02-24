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
  EuiButton,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiAccordion,
  EuiBasicTable,
  EuiSwitch,
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

  const closeFlyout = () => setShowFlyout(false);

  let flyout;

  if (showFlyout) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setShowFlyout(false)} size="l">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>Customise your Elasticsearch Query</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <p>
              The query that will be used to search your data. You can customise it by choosing
              which fields to search on.
            </p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup>
            <EuiFlexItem grow={6}>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="m" lineNumbers>
                {JSON.stringify(createQuery(queryFields, fields), null, 2)}
              </EuiCodeBlock>
            </EuiFlexItem>
            <EuiFlexItem grow={3}>
              <EuiFlexGroup direction="column">
                <EuiText>
                  <h5>Selected Fields</h5>
                </EuiText>
                {Object.entries(fields).map(([index, group]) => (
                  <EuiFlexItem grow={false} key={index}>
                    <EuiPanel grow={false} hasShadow={false} hasBorder>
                      <EuiAccordion
                        id={index}
                        buttonContent={
                          <EuiText>
                            <h5>{index}</h5>
                          </EuiText>
                        }
                      >
                        <EuiSpacer size="s" />
                        <EuiBasicTable
                          items={[
                            ...group.elser_query_fields,
                            ...group.dense_vector_query_fields,
                            ...group.bm25_query_fields,
                          ].map((field) => ({
                            field: typeof field === 'string' ? field : field.field,
                          }))}
                          columns={[
                            {
                              field: 'field',
                              name: 'Field',
                              truncateText: false,
                              render: (field: string) => field,
                            },
                            {
                              actions: [
                                {
                                  name: 'toggle',
                                  description: 'Toggle field',
                                  isPrimary: true,
                                  render: ({ field }: { field: string }) => (
                                    <EuiSwitch
                                      showLabel={false}
                                      label="toggle"
                                      checked={isQueryFieldSelected(index, field)}
                                      onChange={(e) => toggleQueryField(index, field)}
                                      compressed
                                    />
                                  ),
                                },
                              ],
                            },
                          ]}
                          hasActions
                        />
                      </EuiAccordion>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={saveQuery} fill>
                Save changes
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <>
      {flyout}
      <EuiButtonEmpty onClick={() => setShowFlyout(true)} disabled={selectedIndices?.length === 0}>
        View Query
      </EuiButtonEmpty>
    </>
  );
};
