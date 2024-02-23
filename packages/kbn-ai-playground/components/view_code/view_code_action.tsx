/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCodeBlock,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiSteps,
  EuiCode,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ChatForm } from '../../types';

interface ViewCodeActionProps {}

export const ViewCodeAction: React.FC<ViewCodeActionProps> = () => {
  const { getValues } = useFormContext<ChatForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices: string[] = getValues('indices');

  let flyout;

  const steps = [
    {
      title: 'Generate and copy an API key',
      children: (
        <>
          <EuiText>
            <p>Run this code snippet to install things.</p>
          </EuiText>
          <EuiSpacer />
          <EuiCodeBlock language="bash">npm install</EuiCodeBlock>
        </>
      ),
    },
    {
      title: 'Create application',
      children: (
        <EuiText>
          <p>
            Now that you&apos;ve completed step 2, go find the <EuiCode>thing</EuiCode>.
          </p>
          <p>
            Go to <strong>Overview &gt;&gt; Endpoints</strong> note <strong>Elasticsearch</strong>{' '}
            as <EuiCode>&lt;thing&gt;</EuiCode>.
          </p>
        </EuiText>
      ),
    },
  ];

  if (showFlyout) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setShowFlyout(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>Download Code</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <p>Download the code to use in your application.</p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSteps steps={steps} headingElement="h2" />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <>
      {flyout}
      <EuiButton
        color="primary"
        fill
        onClick={() => setShowFlyout(true)}
        disabled={!selectedIndices || selectedIndices?.length === 0}
      >
        Download Code
      </EuiButton>
    </>
  );
};
