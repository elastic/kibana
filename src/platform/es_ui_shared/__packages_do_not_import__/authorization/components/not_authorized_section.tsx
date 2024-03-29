/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';

interface Props {
  title: React.ReactNode;
  message: React.ReactNode | string;
  dataTestSubj?: string;
}

export const NotAuthorizedSection = ({ title, message, dataTestSubj }: Props) => (
  <EuiPageTemplate.EmptyPrompt
    iconType="securityApp"
    data-test-subj={dataTestSubj ? dataTestSubj : 'notAuthorizedSection'}
    title={<h2>{title}</h2>}
    body={<p>{message}</p>}
  />
);
