/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiText,
} from '@elastic/eui';
import { createMockServices, MOCK_TAGS } from '@kbn/content-list-mock-data';
import { ContentListProvider, type ContentListServices, type ContentListFeatures } from '..';
import { createMockItems, createMockFindItems, identityTransform } from '../test_utils';
import {
  ContentListToolbar,
  ContentListTable,
  DeveloperTools,
  type PresetConfig,
} from './components';

// =============================================================================
// Preset Configuration
// =============================================================================

/**
 * Presets demonstrate different provider configurations.
 * Use the preset selector to switch between them.
 */

type PresetType = 'minimal' | 'default' | 'full';

/** Mock services for presets that need them. */
const mockServices = createMockServices({
  tags: true,
  favorites: true,
  userProfiles: true,
  tagList: MOCK_TAGS,
});

/**
 * Available presets:
 * - **Minimal**: All features disabled. Static read-only list.
 * - **Default**: Provider defaults. Minimal configuration needed.
 * - **Full**: All features enabled with services configured.
 */
const PRESETS: Record<PresetType, PresetConfig & { services?: ContentListServices }> = {
  minimal: {
    label: 'Minimal',
    description: 'All features disabled. Just a static list.',
    features: { search: false, filtering: false, sorting: false, pagination: false },
    services: mockServices,
    isReadOnly: true,
  },
  default: {
    label: 'Default',
    description: 'Provider defaults. No custom configuration needed.',
    features: {},
    isReadOnly: false,
  },
  full: {
    label: 'Full',
    description: 'All features enabled with tags, favorites, and user profile services.',
    features: {
      search: { placeholder: 'Search dashboards...', debounceMs: 300 },
      filtering: true,
      sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
      pagination: { initialPageSize: 10 },
      selection: {
        // eslint-disable-next-line no-console
        onSelectionDelete: (items: unknown[]) => console.log('Delete:', items),
        // eslint-disable-next-line no-console
        onSelectionExport: (items: unknown[]) => console.log('Export:', items),
      },
    },
    services: mockServices,
    isReadOnly: false,
  },
};

// =============================================================================
// Story Configuration
// =============================================================================

interface InteractiveStoryArgs {
  /** Entity name (singular). */
  entityName: string;
  /** Number of mock items to generate. */
  itemCount: number;
  /** Simulate loading delay (3 seconds). */
  simulateLoading: boolean;
  /** Simulate fetch error. */
  simulateError: boolean;
}

const meta: Meta<InteractiveStoryArgs> = {
  title: 'Content Management/Content List/Provider',
  parameters: {
    docs: {
      description: {
        component: `
The \`ContentListProvider\` manages state for content list UIs.

**How to use this demo:**
1. Use the **Preset Selector** to switch between configurations
2. Interact with the toolbar and table to see state changes
3. Check the **Developer Tools** panel for configuration and state

**Presets:**
- **Minimal** - Static list, all features disabled
- **Default** - Provider defaults, minimal config
- **Full** - All features with services (tags, favorites, user profiles)
        `,
      },
    },
  },
  argTypes: {
    entityName: { control: 'text', table: { category: 'Config' } },
    itemCount: {
      control: { type: 'number', min: 0, max: 200, step: 10 },
      table: { category: 'Data' },
    },
    simulateLoading: { control: 'boolean', table: { category: 'Data' } },
    simulateError: { control: 'boolean', table: { category: 'Data' } },
  },
};

export default meta;
type Story = StoryObj<InteractiveStoryArgs>;

// =============================================================================
// Story Helpers
// =============================================================================

/**
 * Creates a `findItems` function with optional loading delay or error simulation.
 */
const createFindItemsWithSimulation = (
  itemCount: number,
  simulateLoading: boolean,
  simulateError: boolean
) => {
  if (simulateError) {
    return async () => {
      throw new Error('Simulated fetch error');
    };
  }

  const baseFindItems = createMockFindItems(createMockItems(itemCount));

  if (simulateLoading) {
    return async (params: Parameters<typeof baseFindItems>[0]) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return baseFindItems(params);
    };
  }

  return baseFindItems;
};

// =============================================================================
// Interactive Story
// =============================================================================

export const Interactive: Story = {
  args: {
    entityName: 'dashboard',
    itemCount: 50,
    simulateLoading: false,
    simulateError: false,
  },

  render: function InteractiveStory(args) {
    const [selectedPreset, setSelectedPreset] = useState<PresetType>('default');
    const preset = PRESETS[selectedPreset];

    // Create findItems function based on simulation settings.
    const findItems = useMemo(
      () => createFindItemsWithSimulation(args.itemCount, args.simulateLoading, args.simulateError),
      [args.itemCount, args.simulateLoading, args.simulateError]
    );

    return (
      <div>
        {/* Preset selector. */}
        <EuiPanel paddingSize="m" hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Select preset"
                options={[
                  { id: 'minimal', label: 'Minimal' },
                  { id: 'default', label: 'Default' },
                  { id: 'full', label: 'Full' },
                ]}
                idSelected={selectedPreset}
                onChange={(id) => setSelectedPreset(id as PresetType)}
                buttonSize="m"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {preset.description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Provider wrapping the demo content. */}
        <ContentListProvider
          key={selectedPreset} // Reset state on preset change.
          entityName={args.entityName}
          entityNamePlural={`${args.entityName}s`}
          isReadOnly={preset.isReadOnly}
          dataSource={{ findItems, transform: identityTransform }}
          services={preset.services}
          features={preset.features as ContentListFeatures}
        >
          <EuiFlexGroup gutterSize="l" alignItems="flexStart">
            {/* Main content area. */}
            <EuiFlexItem grow={2}>
              <EuiFlexGroup gutterSize="m" direction="column">
                <EuiFlexItem>
                  <ContentListToolbar />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ContentListTable />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {/* Developer tools sidebar. */}
            <EuiFlexItem grow={1} style={{ minWidth: 350 }}>
              <DeveloperTools preset={preset} entityName={args.entityName} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </ContentListProvider>
      </div>
    );
  },
};
