/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiCode, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';
import { WrappingPrinter } from './components/wrapping_printer';
import { BasicPrinter } from './components/basic_printer';

export const PreviewPrint: React.FC = (props) => {
  const state = useEsqlInspector();
  const src = useBehaviorSubject(state.src$);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel hasShadow={false} hasBorder>
        <EuiText>
          <p>
            Formatted with <EuiCode>WrappingPrettyPrinter</EuiCode>:
          </p>
        </EuiText>
        <EuiSpacer />
        <WrappingPrinter src={src} />

        <EuiSpacer size="l" />

        <EuiText>
          <p>
            Formatted with <EuiCode>BasicPrettyPrinter</EuiCode>:
          </p>
        </EuiText>
        <EuiSpacer />
        <BasicPrinter src={src} />
      </EuiPanel>
    </>
  );
};
