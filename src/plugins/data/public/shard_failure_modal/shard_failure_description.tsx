/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getFlattenedObject } from '@kbn/std';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { ShardFailure } from './shard_failure_types';

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
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const flattendReason = getFlattenedObject(props.reason);

  const reasonItems = Object.entries(flattendReason)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => ({
      title: formatKey(key),
      description: formatValueByKey(value, key),
    }));

  const items = [
    {
      title: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.shardTitle', {
        defaultMessage: 'Shard',
      }),
      description: props.shard,
    },
    {
      title: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.indexTitle', {
        defaultMessage: 'Index',
      }),
      description: props.index,
    },
    {
      title: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.reasonTypeTitle', {
        defaultMessage: 'Type',
      }),
      description: props.reason.type,
    },
    ...(showDetails
      ? [
          {
            title: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.nodeTitle', {
              defaultMessage: 'Node',
            }),
            description: props.node,
          },
          ...reasonItems,
        ]
      : []),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="none" alignItems="stretch">
      <EuiFlexItem grow={false}>
        <EuiDescriptionList
          type="responsiveColumn"
          gutterSize="s"
          listItems={items}
          compressed
          className="shardFailureModal__desc"
          titleProps={{ className: 'shardFailureModal__descTitle' }}
          descriptionProps={{ className: 'shardFailureModal__descValue' }}
        />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          align-self: flex-start;
        `}
      >
        <EuiButtonEmpty size="s" onClick={() => setShowDetails((prev) => !prev)} flush="left">
          {showDetails
            ? i18n.translate(
                'data.search.searchSource.fetch.shardsFailedModal.showLessButtonLabel',
                {
                  defaultMessage: 'Show less',
                }
              )
            : i18n.translate(
                'data.search.searchSource.fetch.shardsFailedModal.showMoreButtonLabel',
                {
                  defaultMessage: 'Show details',
                }
              )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
