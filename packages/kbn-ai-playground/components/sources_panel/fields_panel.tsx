/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';
import { getElasticsearchQuery } from '../../state/generate_query';
import { useIndicesFields } from '../../hooks/useIndicesFields';

interface FieldsPanelProps {
  indices: string[];
}

export const FieldsPanel: React.FC<FieldsPanelProps> = ({ indices }) => {
  const { fields, isLoading } = useIndicesFields(indices);
  const [queryFields, setQueryFields] = useState<string[]>([]);
  const [showFlyout, setShowFlyout] = useState(false);

  useEffect(() => {
    setQueryFields([]);
  }, [indices]);

  const toggleQueryField = (field: string) => {
    if (queryFields.includes(field)) {
      setQueryFields(queryFields.filter((x) => x !== field));
    } else {
      setQueryFields([...queryFields, field]);
    }
  };

  let flyout;

  if (showFlyout && fields) {
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
                {JSON.stringify(getElasticsearchQuery(queryFields, fields), null, 2)}
              </EuiCodeBlock>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              {Object.keys(fields).map((index: string) => {
                const group = fields[index];
                return (
                  <>
                    <h2>{index}</h2>
                    {[...group.elser_query_fields, ...group.dense_vector_query_fields].map(
                      (field) => {
                        return (
                          <EuiLink onClick={() => toggleQueryField(field.field)}>
                            {field.field} ({field.model_id})
                          </EuiLink>
                        );
                      }
                    )}
                    {group.bm25_query_fields.map((field) => {
                      return <EuiLink onClick={() => toggleQueryField(field)}>{field}</EuiLink>;
                    })}
                  </>
                );
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <div>
      {flyout}
      <EuiLink onClick={() => setShowFlyout(true)}>Edit Query</EuiLink>
    </div>
  );
};
