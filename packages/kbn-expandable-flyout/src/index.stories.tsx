/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { ExpandableFlyout } from '.';
import { ExpandableFlyoutContext } from './context';

export default {
  component: ExpandableFlyout,
  title: 'ExpandableFlyout',
};

const registeredPanels = [
  {
    key: 'right',
    component: () => (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h1>{'Right panel header'}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <p>{'Example of a right component body'}</p>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton color="primary">{'Footer button'}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    ),
  },
  {
    key: 'left',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Left panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a left component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview1',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of a preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
  {
    key: 'preview2',
    component: () => (
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>{'Second preview panel header'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <p>{'Example of another preview component content'}</p>
          <EuiFlexItem grow={false} />
        </EuiFlexGroup>
      </EuiPanel>
    ),
  },
];

export const Right: Story<void> = () => {
  const context: ExpandableFlyoutContext = {
    panels: {
      right: {
        id: 'right',
      },
      left: {},
      preview: [],
    },
    closeFlyout: () => window.alert('closeFlyout api'),
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={context}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Left: Story<void> = () => {
  const context: ExpandableFlyoutContext = {
    panels: {
      right: {
        id: 'right',
      },
      left: {
        id: 'left',
      },
      preview: [],
    },
    closeFlyout: () => window.alert('closeFlyout api'),
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={context}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const Preview: Story<void> = () => {
  const context: ExpandableFlyoutContext = {
    panels: {
      right: {
        id: 'right',
      },
      left: {
        id: 'left',
      },
      preview: [
        {
          id: 'preview1',
        },
      ],
    },
    closePreviewPanel: () => window.alert('closePreviewPanel api'),
    closeFlyout: () => window.alert('closeFlyout api'),
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={context}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </ExpandableFlyoutContext.Provider>
  );
};

export const MultiplePreviews: Story<void> = () => {
  const context: ExpandableFlyoutContext = {
    panels: {
      right: {
        id: 'right',
      },
      left: {
        id: 'left',
      },
      preview: [
        {
          id: 'preview1',
        },
        {
          id: 'preview2',
        },
      ],
    },
    closePreviewPanel: () => window.alert('closePreviewPanel api'),
    previousPreviewPanel: () => window.alert('previousPreviewPanel api'),
    closeFlyout: () => window.alert('closeFlyout api'),
  } as unknown as ExpandableFlyoutContext;

  return (
    <ExpandableFlyoutContext.Provider value={context}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </ExpandableFlyoutContext.Provider>
  );
};
