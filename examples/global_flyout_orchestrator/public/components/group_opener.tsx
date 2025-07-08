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
  EuiFlyoutChildProps,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutSessionOpenGroupOptions,
  EuiFlyoutSessionProvider,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFlyoutSession,
} from '@elastic/eui';

const GroupOpenerControls: React.FC<{
  childBackgroundStyle: EuiFlyoutChildProps['backgroundStyle'];
  childSize: 's' | 'm';
  parentType: 'push' | 'overlay';
}> = ({ childBackgroundStyle: backgroundStyle, childSize, parentType }) => {
  const { openFlyoutGroup, isFlyoutOpen, isChildFlyoutOpen, clearHistory } = useEuiFlyoutSession();

  const handleOpenGroup = () => {
    const options: EuiFlyoutSessionOpenGroupOptions = {
      main: {
        title: 'Group opener, main flyout',
        size: 's',
        flyoutProps: {
          type: parentType,
          pushMinBreakpoint: 'xs',
          className: 'groupOpenerMainFlyout',
          'aria-label': 'Main flyout',
        },
      },
      child: {
        title: 'Group opener, child flyout',
        size: childSize,
        flyoutProps: {
          backgroundStyle,
          className: 'groupOpenerChildFlyout',
          'aria-label': 'Child flyout',
        },
      },
    };
    openFlyoutGroup(options);
  };

  return (
    <>
      <EuiButton
        onClick={handleOpenGroup}
        fill
        color="primary"
        iconType="folderOpen"
        data-testid="openFlyoutGroupButton"
        isDisabled={isFlyoutOpen || isChildFlyoutOpen}
      >
        Open flyouts
      </EuiButton>
      {(isFlyoutOpen || isChildFlyoutOpen) && (
        <>
          <EuiSpacer />
          <EuiButton onClick={clearHistory} color="danger">
            Close All Flyouts
          </EuiButton>
        </>
      )}
    </>
  );
};

export const GroupOpenerApp: React.FC = () => {
  const MainFlyoutContent = () => {
    const { clearHistory } = useEuiFlyoutSession();
    return (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id="flyout-main-title">Main Flyout</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              This is the main flyout content. It was opened simultaneously with the child flyout
              using the <code>openFlyoutGroup</code> function.
            </p>
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton onClick={clearHistory} color="danger">
            Close All Flyouts
          </EuiButton>
        </EuiFlyoutFooter>
      </>
    );
  };

  const ChildFlyoutContent = () => {
    const { closeChildFlyout } = useEuiFlyoutSession();
    return (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id="flyout-child-title">Child Flyout</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              This is the child flyout content. It was opened simultaneously with the main flyout
              using the <code>openFlyoutGroup</code> function.
            </p>
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton onClick={closeChildFlyout} color="danger">
            Close Child Only
          </EuiButton>
        </EuiFlyoutFooter>
      </>
    );
  };

  const renderMainFlyoutContent = () => {
    return <MainFlyoutContent />;
  };

  const renderChildFlyoutContent = () => {
    return <ChildFlyoutContent />;
  };

  const [backgroundStyle, setBackgroundStyle] =
    useState<EuiFlyoutChildProps['backgroundStyle']>('default');
  const backgroundStyleRadios: EuiRadioGroupOption[] = [
    { id: 'default', label: 'Default' },
    { id: 'shaded', label: 'Shaded' },
  ];
  const [parentType, setParentType] = useState<'push' | 'overlay'>('push');
  const parentTypeRadios: EuiRadioGroupOption[] = [
    { id: 'push', label: 'Push' },
    { id: 'overlay', label: 'Overlay' },
  ];
  const [childSize, setChildSize] = useState<'s' | 'm'>('s');
  const childSizeRadios: EuiRadioGroupOption[] = [
    { id: 's', label: 'Small' },
    { id: 'm', label: 'Medium' },
  ];

  return (
    <>
      <EuiText>
        <p>
          This demo shows how to use the <code>openFlyoutGroup</code> function to simultaneously
          open both main and child flyouts. We also see an example of the child flyout
          &quot;shaded&quot; background style.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiRadioGroup
        options={parentTypeRadios}
        idSelected={parentType}
        onChange={(id) => setParentType(id as 'push' | 'overlay')}
        legend={{ children: 'Main flyout type' }}
        name="statefulFlyoutTypeToggle"
      />
      <EuiSpacer />
      <EuiRadioGroup
        options={backgroundStyleRadios}
        idSelected={backgroundStyle}
        onChange={(id) => setBackgroundStyle(id as EuiFlyoutChildProps['backgroundStyle'])}
        legend={{ children: 'Child flyout background style' }}
        name="statefulFlyoutBackgroundStyleToggle"
      />
      <EuiSpacer />
      <EuiRadioGroup
        options={childSizeRadios}
        idSelected={childSize}
        onChange={(id) => setChildSize(id as 's' | 'm')}
        legend={{ children: 'Child flyout size' }}
        name="statefulFlyoutSizeToggle"
      />
      <EuiSpacer />
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderMainFlyoutContent}
        renderChildFlyoutContent={renderChildFlyoutContent}
        onUnmount={() => console.log('FlyoutGroup flyouts have been unmounted')}
      >
        <GroupOpenerControls
          parentType={parentType}
          childBackgroundStyle={backgroundStyle}
          childSize={childSize}
        />
      </EuiFlyoutSessionProvider>
    </>
  );
};
