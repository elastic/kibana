/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiFlyoutFooter, EuiFlyoutFooterProps } from '@elastic/eui';

export const Footer: React.FC<
  { children: React.ReactNode } & Omit<EuiFlyoutFooterProps, 'children'>
> = (props) => <EuiFlyoutFooter className="fieldEditor__flyoutPanel__footer" {...props} />;
