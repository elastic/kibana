/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
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
import { TestProvider } from './test/provider';
import { initialUiState, State } from './store/state';

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

export const Right: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: undefined,
          preview: undefined,
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const Left: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const Preview: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
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
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const MultiplePreviews: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
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
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{ hideSettings: true }}
      />
    </TestProvider>
  );
};

export const CollapsedPushMode: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: undefined,
          preview: undefined,
        },
      },
    },
    ui: {
      ...initialUiState,
      pushVsOverlay: 'push',
    },
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const ExpandedPushMode: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
        },
      },
    },
    ui: {
      ...initialUiState,
      pushVsOverlay: 'push',
    },
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const DisableTypeSelection: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{
          pushVsOverlay: { disabled: true, tooltip: 'This option is disabled' },
        }}
      />
    </TestProvider>
  );
};

export const ResetWidths: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout registeredPanels={registeredPanels} />
    </TestProvider>
  );
};

export const DisableResizeWidthSelection: StoryFn<void> = () => {
  const state: State = {
    panels: {
      byId: {
        memory: {
          right: {
            id: 'right',
          },
          left: {
            id: 'left',
          },
          preview: undefined,
        },
      },
    },
    ui: initialUiState,
  };

  return (
    <TestProvider state={state}>
      <ExpandableFlyout
        registeredPanels={registeredPanels}
        flyoutCustomProps={{
          resize: { disabled: true, tooltip: 'This option is disabled' },
        }}
      />
    </TestProvider>
  );
};
