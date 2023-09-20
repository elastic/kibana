/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
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
export function formatValueByKey(value: unknown, key: string): string | JSX.Element {
  if (key === 'script' || key === 'script_stack') {
    const valueScript = Array.isArray(value) ? value.join('\n') : String(value);
    return (
      <EuiCodeBlock language="java" paddingSize="s" isCopyable>
        {valueScript}
      </EuiCodeBlock>
    );
  }

  return String(value);
}

interface Props {
  failure: ShardFailure;
  onClose: () => void;
}

export function FailureDetails({ failure, onClose }: Props) {
  const flattendReason = getFlattenedObject(failure.reason);

  const reasonItems = Object.entries(flattendReason)
    .filter(([key]) => key !== 'type')
    .map(([key, value]) => ({
      title: formatKey(key),
      description: formatValueByKey(value, key),
    }));

  const items = [
    {
      title: i18n.translate('inspector.requests.shardsDetails.shardTitle', {
        defaultMessage: 'Shard',
      }),
      description: failure.shard,
    },
    {
      title: i18n.translate('inspector.requests.shardsDetails.indexTitle', {
        defaultMessage: 'Index',
      }),
      description: failure.index,
    },
    {
      title: i18n.translate('inspector.requests.shardsDetails.reasonTypeTitle', {
        defaultMessage: 'Type',
      }),
      description: failure.reason.type,
    },
    {
      title: i18n.translate('inspector.requests.shardsDetails.nodeTitle', {
        defaultMessage: 'Node',
      }),
      description: failure.node,
    },
    ...reasonItems,
  ];

  return (
    <EuiFlyout onClose={onClose} ownFocus={false}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h1>
            {i18n.translate('inspector.requests.shardsDetails.flyoutTitle', {
              defaultMessage: 'Shard failure',
            })}
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList
          type="responsiveColumn"
          columnWidths={['30%', '70%']}
          listItems={items}
          compressed
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
          {i18n.translate('inspector.requests.shardsDetails.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
