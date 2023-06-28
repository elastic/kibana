/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { useExternalLinkEmbeddable } from '../embeddable/external_link_embeddable';

export const ExternalLinkComponent = () => {
  const embeddable = useExternalLinkEmbeddable();

  const linkLabel = embeddable.select((state) => state.explicitInput.label);
  const url = embeddable.select((state) => state.explicitInput.url);

  return <EuiButtonEmpty iconType="link">{linkLabel || url}</EuiButtonEmpty>;
};
