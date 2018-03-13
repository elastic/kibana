import React from 'react';

import {
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiLinkButton,
  KuiButtonIcon,
} from '@kbn/ui-framework/components';

export function NoVisualizationsPrompt() {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiEmptyTablePrompt
        actions={
          <KuiLinkButton
            href="#/visualize/new"
            buttonType="primary"
            icon={<KuiButtonIcon type="create"/>}
          >
            Create a visualization
          </KuiLinkButton>
        }
        message="Looks like you don't have any visualizations. Let's create some!"
      />
    </KuiEmptyTablePromptPanel>
  );
}
