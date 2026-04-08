/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage as FormattedMessageOriginal } from 'react-intl';
import type { Props } from 'react-intl/src/components/message';

export const FormattedMessage = (props: Props) => {
  const debugMode = i18n.getDebugMode();

  return (
    <FormattedMessageOriginal
      {...props}
      tagName={debugMode ? createTag(props.id) : undefined}
      ignoreTag={debugMode ? false : true}
    />
  );
};

const createTag = (id?: string) => (props: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span data-i18n-id={id} {...props} />;
};
