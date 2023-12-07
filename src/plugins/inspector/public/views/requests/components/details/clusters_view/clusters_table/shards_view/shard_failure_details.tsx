/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiCodeBlock, EuiText } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';

/**
 * Provides pretty formatting of a given key string
 * e.g. formats "this_key.is_nice" to "This key is nice"
 * @param key
 */
export function formatKey(key: string): string {
  const nameCapitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return nameCapitalized.replace(/[\._]/g, ' ');
}
/**
 * Adds a EuiCodeBlock to values of  `script` and `script_stack` key
 * Values of other keys are handled a strings
 * @param value
 * @param key
 */
export function formatValueByKey(value: unknown, key: string): JSX.Element {
  if (key === 'script' || key === 'script_stack') {
    const valueScript = Array.isArray(value) ? value.join('\n') : String(value);
    return (
      <EuiCodeBlock language="java" paddingSize="s" isCopyable>
        {valueScript}
      </EuiCodeBlock>
    );
  }

  return <EuiText size="xs">{String(value)}</EuiText>;
}

interface Props {
  failure: estypes.ShardFailure;
}

export function ShardFailureDetails({ failure }: Props) {
  const flattendReason = getFlattenedObject(failure.reason);

  const reasonItems = Object.entries(flattendReason)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => ({
      title: formatKey(key),
      description: formatValueByKey(value, key),
    }));

  const items = [
    {
      title: i18n.translate('inspector.requests.clusters.shards.details.nodeLabel', {
        defaultMessage: 'Node',
      }),
      description: formatValueByKey(failure.node, 'node'),
    },
    ...reasonItems,
  ];

  return (
    <EuiText size="xs">
      <EuiDescriptionList
        type="responsiveColumn"
        columnWidths={['30%', '70%']}
        listItems={items}
        compressed
      />
    </EuiText>
  );
}
