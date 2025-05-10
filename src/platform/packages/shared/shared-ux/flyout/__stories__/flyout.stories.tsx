/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutSessionOpenChildOptions,
  EuiFlyoutSessionOpenMainOptions,
  EuiFlyoutSessionOpenSystemOptions,
  EuiFlyoutSessionProvider,
  EuiFlyoutSessionRenderContext,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFlyoutSession,
} from '@elastic/eui';

import { PageTemplate } from './page_template';

const BasicFlyoutContent = () => {
  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>Flyout title</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>This is the basic flyout content.</p>
        </EuiText>
      </EuiFlyoutBody>
    </>
  );
};

const BasicChildFlyoutContent = () => {
  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>Child flyout title</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>This is the child flyout content.</p>
        </EuiText>
      </EuiFlyoutBody>
    </>
  );
};

const BasicFlyoutControl = () => {
  const options: EuiFlyoutSessionOpenMainOptions = {
    size: 's',
  };
  const { openFlyout, isFlyoutOpen } = useEuiFlyoutSession();
  return (
    <EuiButton
      onClick={() => {
        openFlyout(options);
      }}
      disabled={isFlyoutOpen}
    >
      Basic flyout (overlay)
    </EuiButton>
  );
};

interface SystemFlyoutRenderContext {
  flyoutIndex: number;
}

const getSystemFlyoutOptions = (
  flyoutIndex: number
): EuiFlyoutSessionOpenSystemOptions<SystemFlyoutRenderContext> => {
  let title: string;
  switch (flyoutIndex) {
    case 2:
      title = 'Second system flyout';
      break;
    default:
      title = 'First system flyout';
      break;
  }

  return {
    size: 'm',
    title,
    flyoutProps: { type: 'push', pushMinBreakpoint: 'xs' },
    meta: { flyoutIndex },
  };
};

const SystemFlyoutContent: React.FC<SystemFlyoutRenderContext> = ({ flyoutIndex }) => {
  const { openSystemFlyout, openChildFlyout } = useEuiFlyoutSession();
  const handleClickOpenChild = () => {
    const options: EuiFlyoutSessionOpenChildOptions = {
      size: 'm',
      title: 'Child flyout',
    };
    openChildFlyout(options);
  };

  const handleClickNext = () => {
    const options = getSystemFlyoutOptions(2);
    openSystemFlyout(options);
  };

  return (
    <EuiFlyoutBody>
      <EuiText>
        <p>This is the system flyout content for flyout {flyoutIndex}.</p>
        <p>
          <EuiButton onClick={handleClickOpenChild}>Open child</EuiButton>
        </p>
        {flyoutIndex === 1 && (
          <p>
            <EuiButton onClick={handleClickNext}>Navigate to next flyout</EuiButton>
          </p>
        )}
      </EuiText>
    </EuiFlyoutBody>
  );
};

const SystemFlyoutControl = () => {
  const options = getSystemFlyoutOptions(1);
  const { openSystemFlyout, isFlyoutOpen } = useEuiFlyoutSession();
  return (
    <EuiButton
      onClick={() => {
        openSystemFlyout(options);
      }}
      disabled={isFlyoutOpen}
    >
      System flyout (push)
    </EuiButton>
  );
};

export const DifferentTypesOfFlyouts = () => {
  const SystemFlyoutButton = () => {
    const renderSystemFlyoutContent = (
      context: EuiFlyoutSessionRenderContext<SystemFlyoutRenderContext>
    ) => {
      const meta = context.meta;
      return <SystemFlyoutContent flyoutIndex={meta?.flyoutIndex ?? 1} />;
    };

    const renderBasicChildFlyoutContent = () => {
      return <BasicChildFlyoutContent />;
    };

    return (
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderSystemFlyoutContent}
        renderChildFlyoutContent={renderBasicChildFlyoutContent}
      >
        <SystemFlyoutControl />
      </EuiFlyoutSessionProvider>
    );
  };

  const BasicFlyoutButton = () => {
    const renderBasicFlyoutContent = () => {
      return <BasicFlyoutContent />;
    };

    return (
      <EuiFlyoutSessionProvider renderMainFlyoutContent={renderBasicFlyoutContent}>
        <BasicFlyoutControl />
      </EuiFlyoutSessionProvider>
    );
  };

  return (
    <PageTemplate title="Flyout example" button={[<SystemFlyoutButton />]}>
      <EuiText>
        <p>
          The &quot;system flyout&quot; shown in the page header opens a flyout that can open a
          child flyout and can navigate to another flyout. The &quot;basic flyout&quot; shown below
          opens a flyout that has no navigation or child flyouts.
        </p>
        <p>
          These two flyouts belong to different <code>EuiFlyoutSessionProvider</code> instances.
          Since there isn&apos;t a &quot;Global Flyout Orchestrator&quot; in this storybook,{' '}
          <b>both types of flyouts can be open at the same time</b>.
        </p>
      </EuiText>
      <EuiSpacer />
      <BasicFlyoutButton />
    </PageTemplate>
  );
};

export default {
  title: 'Flyout System',
  component: DifferentTypesOfFlyouts,
};
