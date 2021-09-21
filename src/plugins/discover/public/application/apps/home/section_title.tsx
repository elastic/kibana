/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import './section_title.scss';
import React from 'react';

export interface SectionTitleProps {
  text: string;
}

export function SectionTitle({ text }: SectionTitleProps) {
  return (
    <React.Fragment>
      <EuiTitle>
        <h1 className="decorated">
          <span>{text}</span>
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
    </React.Fragment>
  );
}
