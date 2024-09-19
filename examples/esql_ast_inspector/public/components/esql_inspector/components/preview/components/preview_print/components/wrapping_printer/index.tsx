/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRange, EuiSwitch } from '@elastic/eui';
import { PrettyPrint } from '../../../../../../../pretty_print';

export interface WrappingPrinterProps {
  src: string;
}

export const WrappingPrinter: React.FC<WrappingPrinterProps> = ({ src }) => {
  const [multiline, setMultiline] = React.useState(false);
  const [lineWidth, setLineWidth] = React.useState(80);

  return (
    <EuiFlexGroup style={{ maxWidth: 1200 }}>
      <EuiFlexItem>
        <PrettyPrint src={src} opts={{ multiline, wrap: lineWidth }} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 300 }}>
        <EuiFormRow label="Multiline">
          <EuiSwitch
            label="Multiline"
            checked={multiline}
            onChange={() => setMultiline((x) => !x)}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow label="Line width">
          <EuiRange
            min={20}
            max={150}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.currentTarget.value))}
            showInput
            aria-label="Wrapping line width"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
