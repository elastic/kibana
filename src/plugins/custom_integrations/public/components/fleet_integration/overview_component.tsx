/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';

/*
Example of Overview component to be shown inside Integrations app
*/
export interface ReadmeProps {
  packageName: string;
}
export const OverviewComponent: React.FC<ReadmeProps> = ({ packageName }) => {
  return (
    <EuiTitle data-test-subj={`languageClient.${packageName}`} size="m">
      <h2>{packageName} client - Overview</h2>
    </EuiTitle>
  );
};
