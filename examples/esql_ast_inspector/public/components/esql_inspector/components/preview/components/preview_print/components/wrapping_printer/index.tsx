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
  EuiRange,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { PrettyPrint } from '../../../../../../../pretty_print';

export interface WrappingPrinterProps {
  src: string;
}

export const WrappingPrinter: React.FC<WrappingPrinterProps> = ({ src }) => {
  const [lowercase, setLowercase] = React.useState(false);
  const [multiline, setMultiline] = React.useState(false);
  const [wrap, setWrap] = React.useState(80);
  const [tab, setTab] = React.useState('  ');
  const [pipeTab, setPipeTab] = React.useState('  ');
  const [indent, setIndent] = React.useState('');

  return (
    <EuiFlexGroup style={{ maxWidth: 1200 }} alignItems={'flexStart'}>
      <EuiFlexItem>
        <PrettyPrint src={src} opts={{ lowercase, multiline, wrap, tab, pipeTab, indent }} />
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

        <EuiFormRow label="Line width">
          <EuiRange
            min={20}
            max={150}
            value={wrap}
            onChange={(e) => setWrap(Number(e.currentTarget.value))}
            showInput
            aria-label="Wrapping line width"
          />
        </EuiFormRow>

        <EuiFormRow label="Initial indentation" helpText="Indentation applied to all lines">
          <EuiFieldText compressed value={indent} onChange={(e) => setIndent(e.target.value)} />
        </EuiFormRow>

        <EuiFormRow label="Tab" helpText="Tabbing for each new indentation level">
          <EuiFieldText compressed value={tab} onChange={(e) => setTab(e.target.value)} />
        </EuiFormRow>

        <EuiFormRow label="Pipe tab" helpText="Tabbing before command pipe">
          <EuiFieldText compressed value={pipeTab} onChange={(e) => setPipeTab(e.target.value)} />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
