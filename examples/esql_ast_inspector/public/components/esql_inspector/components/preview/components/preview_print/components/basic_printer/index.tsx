/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { PrettyPrintBasic } from '../../../../../../../pretty_print_basic';

export interface BasicPrinterProps {
  src: string;
}

export const BasicPrinter: React.FC<BasicPrinterProps> = ({ src }) => {
  const [lowercase, setLowercase] = React.useState(false);
  const [multiline, setMultiline] = React.useState(false);
  const [pipeTab, setPipeTab] = React.useState('  ');

  return (
    <EuiFlexGroup style={{ maxWidth: 1200 }} alignItems={'flexStart'}>
      <EuiFlexItem>
        <PrettyPrintBasic src={src} opts={{ multiline, pipeTab, lowercase }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 300 }}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Lowercase">
              <EuiSwitch
                label="Lowercase"
                checked={lowercase}
                onChange={() => setLowercase((x) => !x)}
                compressed
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Multiline">
              <EuiSwitch
                label="Multiline"
                checked={multiline}
                onChange={() => setMultiline((x) => !x)}
                compressed
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {!!multiline && (
          <EuiFormRow label="Pipe tab" helpText="Tabbing before command pipe">
            <EuiFieldText compressed value={pipeTab} onChange={(e) => setPipeTab(e.target.value)} />
          </EuiFormRow>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
