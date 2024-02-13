/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { copyToClipboard, EuiButton, EuiPanel } from '@elastic/eui';
import { ShareContext } from '@kbn/share-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardContainerInput } from '../../../common';

export const SharePortableDashboard = ({ context }: { context: ShareContext }) => {
  const copyPortableDashboardJSON = async () => {
    const input = context?.sharingData?.fullInput as DashboardContainerInput;

    const content = JSON.stringify({ ...input, viewMode: ViewMode.VIEW }, null, 2);
    copyToClipboard(content);
  };

  return (
    <EuiPanel>
      <EuiButton iconType="copyClipboard" onClick={copyPortableDashboardJSON}>
        Copy JSON
      </EuiButton>
    </EuiPanel>
  );
};
