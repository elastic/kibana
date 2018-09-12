import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { WorkpadLoader } from '../../components/workpad_loader';

export const HomeApp = () => (
  <EuiPage restrictWidth>
    <EuiPageBody>
      <EuiPageContent panelPaddingSize="none" horizontalPosition="center">
        <WorkpadLoader onClose={() => {}} />
      </EuiPageContent>
    </EuiPageBody>
  </EuiPage>
);
