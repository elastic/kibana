/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutSessionOpenMainOptions,
  EuiFlyoutSessionProvider,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFlyoutSession,
} from '@elastic/eui';
import { TYPES } from '@elastic/eui/src/components/flyout/flyout';

type EuiFlyoutType = (typeof TYPES)[number];

const BasicFlyoutContent: React.FC = () => {
  const { clearHistory } = useEuiFlyoutSession();
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyout-basic-title">Basic Flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            This is the basic flyout content. It was opened using the <code>openFlyout</code>{' '}
            function.
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton color="danger" onClick={clearHistory}>
          Close Flyout
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};
const BasicFlyoutControls: React.FC<{
  flyoutType: 'push' | 'overlay';
  flyoutSize: 's' | 'm' | 'l';
}> = ({ flyoutSize, flyoutType }) => {
  const { openFlyout, isFlyoutOpen, isChildFlyoutOpen } = useEuiFlyoutSession();
  const handleOpenFlyout = () => {
    const options: EuiFlyoutSessionOpenMainOptions = {
      flyoutProps: { type: flyoutType },
      size: flyoutSize,
      meta: { type: 'test' },
    };
    openFlyout(options);
  };
  return (
    <>
      <EuiButton
        onClick={handleOpenFlyout}
        fill
        color="primary"
        iconType="folderOpen"
        data-testid="openFlyoutButton"
        isDisabled={isFlyoutOpen || isChildFlyoutOpen}
      >
        Open flyout
      </EuiButton>
    </>
  );
};

export const BasicFlyoutApp: React.FC = () => {
  const [flyoutType, setFlyoutType] = useState<'push' | 'overlay'>('overlay');
  const typeRadios: EuiRadioGroupOption[] = [
    { id: 'push', label: 'Push' },
    { id: 'overlay', label: 'Overlay' },
  ];

  const [size, setSize] = useState<'s' | 'm' | 'l'>('l');
  const sizeRadios: EuiRadioGroupOption[] = [
    { id: 's', label: 'Small' },
    { id: 'm', label: 'Medium' },
    { id: 'l', label: 'Large' },
  ];

  const renderMainFlyoutContent = () => {
    return <BasicFlyoutContent />;
  };

  return (
    <>
      <EuiText>
        <p>
          This demo shows how to use the backwards compatible <code>openFlyout</code> function to
          open a basic flyout.
        </p>
      </EuiText>

      <EuiSpacer />
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderMainFlyoutContent}
        onUnmount={() => console.log('Flyout has been unmounted')}
      >
        <EuiRadioGroup
          options={typeRadios}
          idSelected={flyoutType}
          onChange={(id) => setFlyoutType(id as EuiFlyoutType)}
          legend={{ children: 'Flyout type' }}
          name="statefulFlyoutTypeToggle"
        />
        <EuiSpacer />
        <EuiRadioGroup
          options={sizeRadios}
          idSelected={size}
          onChange={(id) => setSize(id as 's' | 'm' | 'l')}
          legend={{ children: 'Flyout size' }}
          name="statefulFlyoutSizeToggle"
        />
        <EuiSpacer />
        <BasicFlyoutControls flyoutType={flyoutType} flyoutSize={size} />
      </EuiFlyoutSessionProvider>
    </>
  );
};
