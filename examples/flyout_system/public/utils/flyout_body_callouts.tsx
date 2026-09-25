/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';

/**
 * Shared body banner callouts.
 * Returned as an array to preserve direct parent-child relationship with FlyoutTemplate.Body.
 * The action puts a focus stop in the banner, between the body scroll container and its content.
 */
export const bodyCallouts = () => [
  <FlyoutTemplate.Body.Callout
    key="callout-disabled"
    id="disabled"
    level="warning"
    title="Rule is disabled"
    text="No alerts are generated until the rule is enabled again."
    data-test-subj="flyoutBodyCalloutDisabled"
  />,
  <FlyoutTemplate.Body.Callout
    key="callout-failures"
    id="failures"
    level="danger"
    title="3 actions failed"
    actionProps={{
      primary: {
        children: 'Retry',
        onClick: () => console.log('retry failed actions'), // eslint-disable-line no-console
        'data-test-subj': 'flyoutBodyCalloutRetry',
      },
    }}
    data-test-subj="flyoutBodyCalloutFailures"
  />,
];
