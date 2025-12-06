/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListTable } from '@kbn/content-list-table';
import {
  ContentListProvider,
  DEFAULT_SORT_FIELDS,
  useQueryFilter,
  type ContentListItem,
} from '@kbn/content-list-provider';
import {
  STATUS_CONFIG,
  type ContentStatus,
  createSimpleMockFindItems,
  createMockServices,
  MOCK_TAGS,
} from '@kbn/content-list-mock-data';
import { TagList, type Tag } from '@kbn/content-management-tags';
import { FavoriteButton } from '@kbn/content-management-favorites-public';

/** Basic services - no filter services enabled. */
const basicServices = createMockServices();

/** Full services with tags, favorites, and user profiles. */
const fullServices = createMockServices({
  tags: true,
  tagList: MOCK_TAGS,
  favorites: true,
  userProfiles: true,
});

/** Services with tags for clickable tags demo. */
const tagsServices = createMockServices({
  tags: true,
  tagList: MOCK_TAGS,
});

/**
 * Clickable status badge that toggles the status filter when clicked.
 * Demonstrates using `useQueryFilter` for custom filter fields.
 */
const StatusBadge = ({ status }: { status: ContentStatus }) => {
  const { toggle } = useQueryFilter('status');
  const config = STATUS_CONFIG[status];

  const handleClick = useCallback(() => {
    toggle(status);
  }, [toggle, status]);

  return (
    <EuiBadge
      color={config.color}
      onClick={handleClick}
      onClickAriaLabel={`Filter by ${config.label} status`}
    >
      {config.label}
    </EuiBadge>
  );
};

/**
 * Clickable tags cell that toggles the tag filter when a tag is clicked.
 * Demonstrates using `useQueryFilter` for the built-in tag filter.
 */
const TagsCell = ({ tagIds }: { tagIds?: string[] }) => {
  const { toggle } = useQueryFilter('tag');

  const handleTagClick = useCallback(
    (tag: Tag) => {
      if (tag.name) {
        toggle(tag.name);
      }
    },
    [toggle]
  );

  if (!tagIds || tagIds.length === 0) {
    return null;
  }

  return <TagList tagIds={tagIds} onClick={handleTagClick} />;
};

const meta: Meta = {
  title: 'Content Management/Content List/Customization',
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '1400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

/**
 * ## Custom Columns
 *
 * Create custom columns using `<Column>` with a `render` function.
 *
 * The render function receives the item and should return a React node.
 * You can type the item using generics: `<Column<{ myField: string }>>`.
 */
export const CustomColumns: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{ actions: { onEdit } }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Custom Columns</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Custom Status and Type columns with render functions.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Custom columns example">
                <Column.Name showDescription={false} showTags={false} width="40%" />
                <Column
                  id="status"
                  name="Status"
                  width="100px"
                  render={(item: ContentListItem) => (
                    <EuiBadge color={item.updatedAt ? 'success' : 'default'}>
                      {item.updatedAt ? 'Published' : 'Draft'}
                    </EuiBadge>
                  )}
                />
                <Column
                  id="type"
                  name="Type"
                  width="120px"
                  render={(item: ContentListItem) => (
                    <EuiBadge color="hollow">{item.type || 'dashboard'}</EuiBadge>
                  )}
                />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Custom Actions
 *
 * Add custom row actions using `<Action>` with a `handler` function.
 *
 * Built-in actions: `ViewDetails`, `Edit`, `Duplicate`, `Export`, `Delete`.
 * Custom actions need `id`, `label`, `iconType`, and `handler`.
 */
export const CustomActions: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onViewDetails = (item: ContentListItem) => action('view-details')(item.title);
    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const onShare = (item: ContentListItem) => action('share')(item.title);
    const onArchive = (item: ContentListItem) => action('archive')(item.title);
    const onDelete = (item: ContentListItem) => action('delete')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{
          actions: {
            onViewDetails,
            onEdit,
            onDelete,
          },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Custom Actions</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Built-in actions plus custom Share and Archive actions.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Custom actions example">
                <Column.Name width="50%" />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.ViewDetails />
                  <Action.Edit />
                  <Action
                    id="share"
                    label="Share"
                    iconType="share"
                    handler={onShare}
                    tooltip="Share with team"
                  />
                  <Action
                    id="archive"
                    label="Archive"
                    iconType="folderClosed"
                    handler={onArchive}
                    tooltip="Move to archive"
                  />
                  <Action.Delete />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Custom Filters
 *
 * Add custom filter fields using `features.filtering.custom`.
 *
 * Configuration:
 * 1. Define the filter in `filtering.custom: { fieldName: { name, options } }`
 * 2. Handle the custom filter key in your `findItems` function
 * 3. Use `<Filters.Filter field="fieldName" />` to include in the toolbar
 */
export const CustomFilters: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;
    const { Filters, SelectionActions, Button } = ContentListToolbar;

    const onCreate = () => action('create')('New dashboard');
    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const onDelete = (item: ContentListItem) => action('delete')(item.title);
    const onSelectionDelete = (items: ContentListItem[]) =>
      action('bulk-delete')(items.map((i) => i.title));

    const findItems = createSimpleMockFindItems();
    const transform = (item: UserContentCommonSchema & { status?: ContentStatus }) => ({
      id: item.id,
      title: item.attributes.title,
      description: item.attributes.description,
      type: item.type,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedBy: item.updatedBy,
      createdBy: item.createdBy,
      tags: item.references?.filter((r) => r.type === 'tag').map((r) => r.id) ?? [],
      references: item.references,
      isManaged: item.managed,
      canStar: item.managed ? false : undefined,
      status: item.status,
    });

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems, transform }}
        services={fullServices}
        item={{ actions: { onEdit, onDelete } }}
        features={{
          search: { placeholder: 'Filter dashboards...' },
          starred: true,
          tags: true,
          userProfiles: true,
          sorting: {
            fields: [
              ...DEFAULT_SORT_FIELDS,
              {
                field: 'status',
                name: 'Status',
                ascLabel: 'Status: Draft → Active',
                descLabel: 'Status: Active → Draft',
              },
            ],
            initialSort: { field: 'updatedAt', direction: 'desc' },
          },
          filtering: {
            tags: true,
            users: true,
            starred: true,
            custom: {
              status: {
                name: 'Status',
                multiSelect: true,
                options: Object.entries(STATUS_CONFIG).map(([value, config]) => ({
                  value,
                  label: config.label,
                })),
              },
            },
          },
          selection: { onSelectionDelete },
          pagination: { initialPageSize: 10 },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h3>Custom Filters</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <Button iconType="plus" onClick={onCreate}>
                    Create dashboard
                  </Button>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="s" color="subdued">
                <p>Custom &quot;Status&quot; filter added via `filtering.custom`.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar>
                <SelectionActions>
                  <SelectionActions.Action.Delete />
                </SelectionActions>
                <Filters>
                  <Filters.Tags />
                  <Filters.CreatedBy />
                  <Filters.Filter field="status" />
                  <Filters.Sort />
                  <Filters.Starred />
                </Filters>
              </ContentListToolbar>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Custom filters example">
                <Column<{ status?: ContentStatus }>
                  id="status"
                  name="Status"
                  width="100px"
                  render={(item) => {
                    const status = item.status ?? 'draft';
                    return <StatusBadge status={status} />;
                  }}
                />
                <Column<{ favorite?: boolean }>
                  id="favorite"
                  name=""
                  width="25px"
                  render={(item) => <FavoriteButton id={item.id} />}
                />
                <Column.Name showTags={false} showDescription={false} width="30%" />
                <Column.CreatedBy />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                  <Action.Delete />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Expandable Rows
 *
 * Enable row expansion with the `renderDetails` prop on `ContentListTable`.
 *
 * The function receives the item and returns the expanded content.
 * Add `<Column.Expander />` to show the expand/collapse toggle.
 *
 * The render function can be synchronous or asynchronous (return a Promise).
 */
export const ExpandableRows: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const findItems = createSimpleMockFindItems();

    const renderDetails = (item: ContentListItem) => (
      <EuiPanel color="subdued" paddingSize="m">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>ID:</strong> {item.id}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Type:</strong> {item.type}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Created:</strong>{' '}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {item.description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {item.description}
            </EuiText>
          </>
        )}
      </EuiPanel>
    );

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={basicServices}
        item={{ actions: { onEdit } }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Expandable Rows</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Click the arrow to expand rows and see additional details.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Expandable rows example" renderDetails={renderDetails}>
                <Column.Expander />
                <Column.Name width="50%" />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Custom Toolbar Layout
 *
 * Use compound components to control toolbar layout and filter order.
 *
 * Available compound components:
 * - `<SelectionActions>`: Bulk action buttons (shown when items selected)
 * - `<Filters>`: Filter dropdowns container
 * - `<Filters.Tags>`, `<Filters.CreatedBy>`, `<Filters.Sort>`, `<Filters.Starred>`
 * - `<Filters.Filter field="custom">`: Custom filter by field name
 */
export const CustomToolbarLayout: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;
    const { Filters, SelectionActions } = ContentListToolbar;

    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const onDelete = (item: ContentListItem) => action('delete')(item.title);
    const onSelectionDelete = (items: ContentListItem[]) =>
      action('bulk-delete')(items.map((i) => i.title));
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={fullServices}
        item={{ actions: { onEdit, onDelete } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          starred: true,
          tags: true,
          userProfiles: true,
          filtering: { tags: true, users: true, starred: true },
          sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
          selection: { onSelectionDelete },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Custom Toolbar Layout</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Filters in custom order: Sort, Tags, CreatedBy, Starred.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar>
                <SelectionActions>
                  <SelectionActions.Action.Delete />
                </SelectionActions>
                <Filters>
                  <Filters.Sort />
                  <Filters.Tags />
                  <Filters.CreatedBy />
                  <Filters.Starred />
                </Filters>
              </ContentListToolbar>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable title="Custom toolbar layout example">
                <Column.Name />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                  <Action.Delete />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};

/**
 * ## Clickable Cell Content
 *
 * Use the `useQueryFilter` hook to make cell content interactive.
 *
 * When a user clicks on a tag or status badge, it toggles that filter.
 * This provides a quick way to filter by specific values.
 */
export const ClickableCellContent: StoryObj = {
  render: () => {
    const { Column, Action } = ContentListTable;

    const onEdit = (item: ContentListItem) => action('edit')(item.title);
    const findItems = createSimpleMockFindItems();

    return (
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems }}
        services={tagsServices}
        item={{ actions: { onEdit } }}
        features={{
          search: { placeholder: 'Search dashboards...' },
          tags: true,
          filtering: { tags: true },
        }}
      >
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>Clickable Cell Content</h3>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <p>Click on tags in the expanded rows to filter by that tag.</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListToolbar />
            </EuiFlexItem>
            <EuiFlexItem>
              <ContentListTable
                title="Clickable cell content example"
                renderDetails={(item) => {
                  if (!item.tags || item.tags.length === 0) {
                    return null;
                  }
                  return (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>Tags (click to filter):</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <TagsCell tagIds={item.tags} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  );
                }}
              >
                <Column.Expander />
                <Column.Name showTags={false} />
                <Column.UpdatedAt />
                <Column.Actions>
                  <Action.Edit />
                </Column.Actions>
              </ContentListTable>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </ContentListProvider>
    );
  },
};
