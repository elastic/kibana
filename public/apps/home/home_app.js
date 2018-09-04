import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiPanel } from '@elastic/eui';
import { WorkpadLoader } from '../../components/workpad_loader';

export const HomeApp = () => (
  <div className="canvasHomeApp">
    <EuiTitle size="l">
      <h1>Canvas</h1>
    </EuiTitle>
    <EuiText>
      <p>
        Welcome to Canvas! To get started, create a new workpad, or load an existing workpad from
        the controls below.
      </p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiPanel paddingSize="none" className="canvasHomeApp__workpadLoader">
      <WorkpadLoader onClose={() => {}} />
    </EuiPanel>
  </div>
);
