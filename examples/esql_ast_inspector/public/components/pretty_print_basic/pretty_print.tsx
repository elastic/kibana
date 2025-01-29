/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, BasicPrettyPrinter, BasicPrettyPrinterOptions } from '@kbn/esql-ast';
import * as React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

export interface PrettyPrintBasicProps {
  src: string;
  opts?: BasicPrettyPrinterOptions;
}

export const PrettyPrintBasic: React.FC<PrettyPrintBasicProps> = ({ src, opts }) => {
  const formatted = React.useMemo(() => {
    try {
      const { root } = parse(src, { withFormatting: true });

      return BasicPrettyPrinter.print(root, opts);
    } catch {
      return '';
    }
  }, [src, opts]);

  return (
    <EuiCodeBlock language="esql" fontSize="m" paddingSize="m">
      {formatted}
    </EuiCodeBlock>
  );
};
