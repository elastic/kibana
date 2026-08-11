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

const defaultIndent = ' ';

export const WrappingPrinter: React.FC<WrappingPrinterProps> = ({ src }) => {
  const [lowercase, setLowercase] = React.useState(false);
  const [multiline, setMultiline] = React.useState(true);
  const [wrap, setWrap] = React.useState(80);
  const [initialIndent, setInitialIndent] = React.useState(0);
  const [tabValue, setTab] = React.useState(2);
  const [pipeTabValue, setPipeTab] = React.useState(2);

  const indent = defaultIndent.repeat(initialIndent);
  const tab = defaultIndent.repeat(tabValue);
  const pipeTab = defaultIndent.repeat(pipeTabValue);

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
                disabled
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
          <EuiRange
            min={0}
            max={10}
            value={initialIndent}
            onChange={(e) => {
              const inputValue = Number(e.currentTarget.value);
              setInitialIndent(inputValue);
            }}
            showInput
            aria-label="Initial indentation"
          />
        </EuiFormRow>

        <EuiFormRow label="Tab" helpText="Tabbing for each new indentation level">
          <EuiRange
            min={0}
            max={10}
            value={tabValue}
            onChange={(e) => {
              const inputValue = Number(e.currentTarget.value);
              setTab(inputValue);
            }}
            showInput
            aria-label="Nested indentation"
          />
        </EuiFormRow>

        <EuiFormRow label="Pipe tab" helpText="Tabbing before command pipe">
          <EuiRange
            min={0}
            max={10}
            value={pipeTabValue}
            onChange={(e) => {
              const inputValue = Number(e.currentTarget.value);
              setPipeTab(inputValue);
            }}
            showInput
            aria-label="Indentation before pipe"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
