/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';

// Exa brand mark (stylised "E" / window shape), extracted from the official
// Exa docs favicon at https://exa.ai/docs/favicon.svg. The fill uses
// `currentColor` so it follows the EUI theme (dark / light mode).
const ExaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 110" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 0H86V8.20896L49.2981 55L86 101.791V110H0V0ZM43.5408 47.4289L73.3652 8.20896H13.7164L43.5408 47.4289ZM9.67573 18.0375V50.8955H34.6623L9.67573 18.0375ZM34.6623 59.1045H9.67573V91.9625L34.6623 59.1045ZM13.7164 101.791L43.5408 62.5711L73.3652 101.791H13.7164Z"
    />
  </svg>
);

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={ExaIcon} {...props} />;
};
