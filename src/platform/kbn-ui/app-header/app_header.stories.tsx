/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { css } from '@emotion/react';
import { EuiPageTemplate } from '@elastic/eui';
import type { AppMenuConfig } from '@kbn/ui-app-menu';
import type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderMetadataItems,
  AppHeaderSpacing,
  AppHeaderTab,
} from './src';
import { AppHeaderView } from './src';
import { AppHeaderLoadingView, type AppHeaderLoadingMenu } from './src';

interface ComposedHeaderStoryProps {
  title: string;
  editable: boolean;
  spacing: AppHeaderSpacing;
  width: number;
  showBack: boolean;
  showTabs: boolean;
  showBadges: boolean;
  secondaryContent: 'description' | 'metadata' | 'none';
  showFavorite: boolean;
  showMenu: boolean;
}

const badges: AppHeaderBadge[] = [
  { label: 'Beta', color: 'accent' },
  { label: 'Managed', color: 'primary' },
];

const tabs: AppHeaderTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    isSelected: true,
    onClick: action('tab-overview'),
    actions: {
      ariaLabel: 'More actions',
      items: [
        {
          id: 'copy',
          label: 'Copy API request',
          iconType: 'copy',
          onClick: action('tab-overview-copy'),
        },
        {
          id: 'edit',
          label: 'Edit configuration',
          iconType: 'gear',
          onClick: action('tab-overview-edit'),
        },
      ],
    },
  },
  { id: 'alerts', label: 'Alerts', badge: 3, onClick: action('tab-alerts') },
  {
    id: 'insights',
    label: 'Insights',
    badge: { iconType: 'flask', tooltip: 'Beta feature' },
    onClick: action('tab-insights'),
  },
  { id: 'settings', label: 'Settings', onClick: action('tab-settings') },
  {
    id: 'logs',
    label: 'Logs',
    onClick: action('tab-logs'),
    disabled: true,
    toolTipContent: 'Logs are disabled for this app',
  },
];

const metadata: AppHeaderMetadataItems = [
  { type: 'health', label: 'Healthy', color: 'success' },
  { type: 'text', label: 'Created by', value: 'analyst' },
  { type: 'button', label: 'View details', onClick: action('view-details-clicked') },
];

const description = {
  text: 'Query and analyze data stored across multiple Elasticsearch clusters.',
  learnMoreUrl: 'https://www.elastic.co/docs',
};

// Six items so the menu overflows the visible limit into the "More" popover.
const menu: AppMenuConfig = {
  items: Array.from({ length: 6 }, (_, index) => ({
    id: `action-${index}`,
    order: index,
    label: `Action ${index + 1}`,
    iconType: 'gear',
    run: action(`menu-action-${index}`),
  })),
};

const ComposedHeader = ({
  title: initialTitle,
  editable,
  spacing,
  width,
  showBack,
  showTabs,
  showBadges,
  secondaryContent,
  showFavorite,
  showMenu,
}: ComposedHeaderStoryProps) => {
  const [title, setTitle] = useState(initialTitle);

  const editableTitle = {
    text: title,
    onSave: async (nextTitle: string) => {
      action('title-saved')(nextTitle);
      setTitle(nextTitle);
    },
  };
  const secondaryContentProps =
    secondaryContent === 'description'
      ? { description }
      : secondaryContent === 'metadata'
      ? { metadata }
      : {};

  return (
    <div
      css={css`
        width: ${width}px;
      `}
    >
      <AppHeaderView
        title={editable ? editableTitle : title}
        back={showBack ? { href: '/app/management', label: 'Stack Management' } : undefined}
        tabs={showTabs ? tabs : undefined}
        badges={showBadges ? badges : undefined}
        {...secondaryContentProps}
        menu={showMenu ? menu : undefined}
        favorite={
          showFavorite
            ? {
                status: 'unfavorited',
                onToggle: action('favorite'),
              }
            : undefined
        }
        sticky={false}
        spacing={spacing}
      />
    </div>
  );
};

const meta: Meta<ComposedHeaderStoryProps> = {
  title: 'App Header',
  component: ComposedHeader,
  decorators: [
    (Story) => (
      <EuiPageTemplate>
        <Story />
      </EuiPageTemplate>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'The composed app header. Toggle the regions (back navigation, tabs, ' +
          'badges, description or metadata, app menu, favorite) to see how they lay out together. For ' +
          'title-specific states see the "App Header Editable Title" story.',
      },
    },
  },
  argTypes: {
    spacing: {
      control: 'inline-radio',
      options: ['standard', 'compact', 'flush', 'bleed', 'largeBleed'],
      description:
        'Outer spacing. Standard uses a 16px symmetric gutter; bleed matches the same 16px inside a padded parent and largeBleed a 24px one.',
    },
    secondaryContent: {
      control: 'inline-radio',
      options: ['description', 'metadata', 'none'],
    },
  },
  args: {
    title: 'System Shells via Services',
    editable: true,
    spacing: 'standard',
    width: 900,
    showBack: true,
    showTabs: true,
    showBadges: true,
    secondaryContent: 'metadata',
    showFavorite: true,
    showMenu: true,
  },
};

export default meta;

type Story = StoryObj<ComposedHeaderStoryProps>;

export const FullHeader: Story = {};

export const FullHeaderWithDescription: Story = {
  args: {
    secondaryContent: 'description',
  },
};

export const TitleOnly: Story = {
  args: {
    showBack: false,
    showTabs: false,
    showBadges: false,
    secondaryContent: 'none',
    showFavorite: false,
    showMenu: false,
  },
};

export const WithoutTabs: Story = {
  args: {
    showTabs: false,
  },
};

export const NonEditableTitle: Story = {
  args: {
    editable: false,
  },
};

const LoadingHeader = ({
  menuSkeleton,
  back,
}: {
  menuSkeleton?: AppHeaderLoadingMenu;
  back?: AppHeaderBack;
}) => {
  return (
    <div
      css={css`
        width: 900px;
      `}
    >
      <AppHeaderLoadingView menu={menuSkeleton} back={back} sticky={false} />
    </div>
  );
};

export const Loading: Story = {
  render: () => <LoadingHeader />,
  parameters: {
    docs: {
      description: {
        story:
          'Default `AppHeaderLoading`: title skeleton plus overflow and primary-action placeholders.',
      },
    },
  },
};

export const LoadingCustomMenu: Story = {
  render: () => <LoadingHeader menuSkeleton={{ buttonCount: 2, hasPrimary: false }} />,
  parameters: {
    docs: {
      description: {
        story:
          'Customized menu skeleton (`buttonCount: 2`, no primary) for headers that will not look ' +
          'like the default overflow + primary layout.',
      },
    },
  },
};

export const LoadingWithBack: Story = {
  render: () => <LoadingHeader back={{ href: '/app/management', label: 'Stack Management' }} />,
  parameters: {
    docs: {
      description: {
        story:
          '`AppHeaderLoading` with a back button. The title and menu stay skeletoned; only the ' +
          'known back target renders.',
      },
    },
  },
};

const defaultLoadedMenu: AppMenuConfig = {
  items: [
    {
      id: 'settings',
      order: 0,
      label: 'Settings',
      iconType: 'gear',
      overflow: true,
      run: action('settings'),
    },
  ],
  primaryActionItem: {
    id: 'save',
    label: 'Save',
    iconType: 'save',
    run: action('save'),
  },
};

const twoIconMenu: AppMenuConfig = {
  items: [
    {
      id: 'settings',
      order: 0,
      label: 'Settings',
      iconType: 'gear',
      run: action('settings'),
    },
    {
      id: 'share',
      order: 1,
      label: 'Share',
      iconType: 'share',
      run: action('share'),
    },
  ],
};

const comparisonBack: AppHeaderBack = { href: '/app/management', label: 'Stack Management' };

const loadingSwapCases: Array<{
  name: string;
  note?: string;
  loading: {
    back?: AppHeaderBack;
    menu?: AppHeaderLoadingMenu;
    spacing?: AppHeaderSpacing;
  };
  loaded: ComponentProps<typeof AppHeaderView>;
}> = [
  {
    name: 'Default (title + overflow + primary)',
    loading: {},
    loaded: { title: 'System Shells via Services', menu: defaultLoadedMenu, sticky: false },
  },
  {
    name: 'With back',
    loading: { back: comparisonBack },
    loaded: {
      title: 'System Shells via Services',
      back: comparisonBack,
      menu: defaultLoadedMenu,
      sticky: false,
    },
  },
  {
    name: 'Title only',
    loading: { menu: { buttonCount: 0, hasPrimary: false } },
    loaded: { title: 'System Shells via Services', sticky: false },
  },
  {
    name: 'Custom menu (2 icons, no primary)',
    loading: { menu: { buttonCount: 2, hasPrimary: false } },
    loaded: { title: 'System Shells via Services', menu: twoIconMenu, sticky: false },
  },
  {
    name: 'Compact spacing',
    loading: { spacing: 'compact' },
    loaded: {
      title: 'System Shells via Services',
      menu: defaultLoadedMenu,
      spacing: 'compact',
      sticky: false,
    },
  },
  {
    name: 'Multi-row (tabs + metadata) — expected height shift',
    note: 'AppHeaderLoading only skeletons the primary row. Tabs and metadata add a second row.',
    loading: {},
    loaded: {
      title: 'System Shells via Services',
      menu: defaultLoadedMenu,
      tabs,
      metadata,
      sticky: false,
    },
  },
];

const comparisonGrid = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 900px;
`;

const comparisonPair = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
`;

const comparisonLabel = css`
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const comparisonNote = css`
  font-size: 12px;
  opacity: 0.7;
  margin: 0 0 8px;
`;

const LoadingToLoadedComparison = () => {
  return (
    <div css={comparisonGrid}>
      {loadingSwapCases.map((swapCase) => (
        <section key={swapCase.name}>
          <div css={comparisonLabel}>{swapCase.name}</div>
          {swapCase.note ? <p css={comparisonNote}>{swapCase.note}</p> : null}
          <div css={comparisonPair}>
            <div>
              <div css={comparisonLabel}>Loading</div>
              <AppHeaderLoadingView {...swapCase.loading} sticky={false} />
            </div>
            <div>
              <div css={comparisonLabel}>Loaded</div>
              <AppHeaderView {...swapCase.loaded} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export const LoadingToLoaded: Story = {
  render: () => <LoadingToLoadedComparison />,
  parameters: {
    docs: {
      description: {
        story:
          'Side-by-side loading vs loaded for typical single-row combinations. Height and the ' +
          'trailing menu width should match closely; title width is a fixed skeleton. Multi-row ' +
          'headers (tabs, description, metadata) are not fully supported and will shift height.',
      },
    },
  },
};
