/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { getFlattenedObject } from '@kbn/std';
import { EuiCodeBlock, EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { ShardFailure } from './shard_failure_types';
import { ShardFailureDescriptionHeader } from './shard_failure_description_header';

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
export function formatValueByKey(value: unknown, key: string): string | JSX.Element {
  if (key === 'script' || key === 'script_stack') {
    const valueScript = Array.isArray(value) ? value.join('\n') : String(value);
    return (
      <EuiCodeBlock language="java" paddingSize="s" isCopyable>
        {valueScript}
      </EuiCodeBlock>
    );
  } else {
    return String(value);
  }
}

export function ShardFailureDescription(props: ShardFailure) {
  const flattendReason = getFlattenedObject(props.reason);

  const listItems = Object.entries(flattendReason).map(([key, value]) => ({
    title: formatKey(key),
    description: formatValueByKey(value, key),
  }));

  return (
    <div>
      <ShardFailureDescriptionHeader {...props} />
      <EuiSpacer size="m" />
      <EuiDescriptionList
        listItems={listItems}
        type="column"
        compressed
        className="shardFailureModal__desc"
        titleProps={{ className: 'shardFailureModal__descTitle' }}
        descriptionProps={{ className: 'shardFailureModal__descValue' }}
      />
    </div>
  );
}
