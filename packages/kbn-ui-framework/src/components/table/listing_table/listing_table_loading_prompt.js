import React from 'react';

import {
  KuiEmptyTablePromptPanel,
  KuiTableInfo,
} from '../../';

export function KuiListingTableLoadingPrompt() {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiTableInfo>
        Loading...
      </KuiTableInfo>
    </KuiEmptyTablePromptPanel>
  );
}
