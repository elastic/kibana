/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Dispatch } from 'react';
import { css } from '@emotion/react';
import {
  EuiCheckbox,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { PlaygroundAction, PlaygroundState } from './playground_state';
import { FILTER_DEFINITIONS } from './playground_state';
import { BASE_FONT, JsxPropBlock, JsxPropDisplay, JsxTag } from './jsx_tag';
import { ColumnCard, DraggableCard } from './column_card';
import { ComponentPalette } from './component_palette';

// =============================================================================
// Styles
// =============================================================================

const containerCss = css({
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingLeft: 24,
});

const simulationPanelCss = css({ marginLeft: -24 });

const simulationControlsCss = css({ marginTop: 6 });

const itemSelectCss = css({ width: 70 });

const nestedContentCss = css({ paddingLeft: 32 });

const inlineCheckboxCss = css({ display: 'inline-flex' });

// =============================================================================
// Types
// =============================================================================

export interface BuilderPanelProps {
  state: PlaygroundState;
  dispatch: Dispatch<PlaygroundAction>;
}

// =============================================================================
// Inline Controls
// =============================================================================

interface InlineTextProps {
  defaultValue: string;
  onSave: (value: string) => void;
  label: string;
}

const InlineText = ({ defaultValue, onSave, label }: InlineTextProps) => (
  <EuiInlineEditText
    inputAriaLabel={label}
    defaultValue={defaultValue}
    onSave={onSave}
    size="s"
    readModeProps={{ style: BASE_FONT }}
    editModeProps={{ inputProps: { style: BASE_FONT } }}
  />
);

interface InlineCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const InlineCheckbox = ({ id, checked, onChange }: InlineCheckboxProps) => (
  <EuiCheckbox
    id={id}
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    css={inlineCheckboxCss}
  />
);

// =============================================================================
// BuilderPanel
// =============================================================================

/**
 * The full JSX-tree-shaped builder panel.
 *
 * Renders the component tree as indented JSX tags with inline controls for
 * provider props, droppable zones for table columns and toolbar filters,
 * and a palette of available components at the bottom.
 */
export const BuilderPanel = ({ state, dispatch }: BuilderPanelProps) => {
  const idPrefix = useGeneratedHtmlId({ prefix: 'builder' });

  const { provider, features, item, table, toolbar, data } = state;

  const activeActions = table.columns.find((c) => c.type === 'actions')?.actions ?? [];
  const [providerExpanded, setProviderExpanded] = useState(true);

  return (
    <div css={containerCss}>
      {/* ── Simulation controls ────────────────────────────────────── */}
      <EuiPanel paddingSize="s" color="subdued" hasBorder css={simulationPanelCss}>
        <EuiText size="xs" style={BASE_FONT}>
          <strong>Simulation</strong>
        </EuiText>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          wrap
          responsive={false}
          css={simulationControlsCss}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" style={BASE_FONT}>
                  Items
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSuperSelect
                  aria-label="Total items"
                  options={[
                    { value: '0', inputDisplay: '0' },
                    { value: '10', inputDisplay: '10' },
                    { value: '30', inputDisplay: '30' },
                    { value: '50', inputDisplay: '50' },
                    { value: '100', inputDisplay: '100' },
                    { value: '200', inputDisplay: '200' },
                  ]}
                  valueOfSelected={String(data.totalItems)}
                  onChange={(v) =>
                    dispatch({ type: 'SET_DATA_PROP', key: 'totalItems', value: Number(v) })
                  }
                  compressed
                  css={itemSelectCss}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`${idPrefix}-hasItems`}
              label={
                <EuiText size="xs" style={BASE_FONT}>
                  Empty
                </EuiText>
              }
              checked={!data.hasItems}
              onChange={(e) =>
                dispatch({ type: 'SET_DATA_PROP', key: 'hasItems', value: !e.target.checked })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`${idPrefix}-isLoading`}
              label={
                <EuiText size="xs" style={BASE_FONT}>
                  Loading
                </EuiText>
              }
              checked={data.isLoading}
              onChange={(e) =>
                dispatch({ type: 'SET_DATA_PROP', key: 'isLoading', value: e.target.checked })
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="s" />

      {/* ── Palette ────────────────────────────────────────────────── */}
      <ComponentPalette
        activeColumns={table.columns}
        activeFilters={toolbar.filters}
        activeActions={activeActions}
        onAddColumn={(type) => dispatch({ type: 'ADD_COLUMN', columnType: type })}
        onAddFilter={(type) => dispatch({ type: 'ADD_FILTER', filterType: type })}
        onAddAction={(type) => dispatch({ type: 'ADD_ACTION', actionType: type })}
      />

      <EuiSpacer size="m" />

      {/* ── Provider ─────────────────────────────────────────────────── */}
      <JsxTag
        name="ContentListProvider"
        indent={0}
        collapsible
        collapsed={!providerExpanded}
        onToggleCollapsed={() => setProviderExpanded((prev) => !prev)}
      >
        {/* labels prop */}
        <JsxPropBlock name="labels">
          <JsxPropDisplay name="entity">
            <InlineText
              label="Entity name"
              defaultValue={provider.entity}
              onSave={(v) => dispatch({ type: 'SET_PROVIDER_PROP', key: 'entity', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="entityPlural">
            <InlineText
              label="Entity name plural"
              defaultValue={provider.entityPlural}
              onSave={(v) => dispatch({ type: 'SET_PROVIDER_PROP', key: 'entityPlural', value: v })}
            />
          </JsxPropDisplay>
        </JsxPropBlock>

        <JsxPropDisplay name="isReadOnly">
          <InlineCheckbox
            id={`${idPrefix}-isReadOnly`}
            checked={provider.isReadOnly}
            onChange={(v) => dispatch({ type: 'SET_PROVIDER_PROP', key: 'isReadOnly', value: v })}
          />
        </JsxPropDisplay>

        {/* item prop */}
        <JsxPropBlock name="item">
          <JsxPropDisplay name="getHref">
            <InlineCheckbox
              id={`${idPrefix}-getHref`}
              checked={item.getHref}
              onChange={(v) => dispatch({ type: 'SET_ITEM_PROP', key: 'getHref', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="getEditUrl">
            <InlineCheckbox
              id={`${idPrefix}-getEditUrl`}
              checked={item.getEditUrl}
              onChange={(v) => dispatch({ type: 'SET_ITEM_PROP', key: 'getEditUrl', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="onEdit">
            <InlineCheckbox
              id={`${idPrefix}-onEdit`}
              checked={item.onEdit}
              onChange={(v) => dispatch({ type: 'SET_ITEM_PROP', key: 'onEdit', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="onDelete">
            <InlineCheckbox
              id={`${idPrefix}-onDelete`}
              checked={item.onDelete}
              onChange={(v) => dispatch({ type: 'SET_ITEM_PROP', key: 'onDelete', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="onInspect">
            <InlineCheckbox
              id={`${idPrefix}-onInspect`}
              checked={item.onInspect}
              onChange={(v) => dispatch({ type: 'SET_ITEM_PROP', key: 'onInspect', value: v })}
            />
          </JsxPropDisplay>
        </JsxPropBlock>

        {/* features prop */}
        <JsxPropBlock name="features">
          <JsxPropDisplay name="sorting">
            <InlineCheckbox
              id={`${idPrefix}-sorting`}
              checked={features.sorting}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'sorting', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="pagination">
            <InlineCheckbox
              id={`${idPrefix}-pagination`}
              checked={features.pagination}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'pagination', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="search">
            <InlineCheckbox
              id={`${idPrefix}-search`}
              checked={features.search}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'search', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="starred">
            <InlineCheckbox
              id={`${idPrefix}-starred`}
              checked={features.starred}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'starred', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="tags">
            <InlineCheckbox
              id={`${idPrefix}-tags`}
              checked={features.tags}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'tags', value: v })}
            />
          </JsxPropDisplay>
          <JsxPropDisplay name="userProfiles">
            <InlineCheckbox
              id={`${idPrefix}-userProfiles`}
              checked={features.userProfiles}
              onChange={(v) => dispatch({ type: 'SET_FEATURE', key: 'userProfiles', value: v })}
            />
          </JsxPropDisplay>
        </JsxPropBlock>
      </JsxTag>

      {/* ── Toolbar (child of Provider) ──────────────────────────── */}
      {toolbar.filters.length === 0 ? (
        <JsxTag name="ContentListToolbar" selfClosing indent={1} />
      ) : (
        <>
          <JsxTag name="ContentListToolbar" indent={1} />

          <div css={nestedContentCss}>
            <JsxTag name="Filters" indent={0} />

            <EuiDroppable droppableId="filters" type="FILTER" spacing="s">
              {toolbar.filters.map((filter, idx) => {
                const def = FILTER_DEFINITIONS.find((d) => d.type === filter.type);
                return (
                  <EuiDraggable
                    key={filter.instanceId}
                    index={idx}
                    draggableId={filter.instanceId}
                    customDragHandle
                    hasInteractiveChildren
                    spacing="s"
                  >
                    {(provided) => (
                      <DraggableCard
                        label={def?.label ?? filter.type}
                        dragHandleProps={provided.dragHandleProps}
                        onRemove={() =>
                          dispatch({ type: 'REMOVE_FILTER', instanceId: filter.instanceId })
                        }
                      />
                    )}
                  </EuiDraggable>
                );
              })}
            </EuiDroppable>

            <JsxTag name="Filters" closing indent={0} />
          </div>

          <JsxTag name="ContentListToolbar" closing indent={1} />
        </>
      )}

      {/* ── Table (child of Provider) ────────────────────────────── */}
      {table.columns.length === 0 ? (
        <EuiToolTip content="No explicit columns — default columns are displayed.">
          <JsxTag name="ContentListTable" selfClosing indent={1} />
        </EuiToolTip>
      ) : (
        <>
          <JsxTag name="ContentListTable" indent={1} />

          <div css={nestedContentCss}>
            <EuiDroppable droppableId="columns" type="COLUMN" spacing="s">
              {table.columns.map((col, idx) => (
                <EuiDraggable
                  key={col.instanceId}
                  index={idx}
                  draggableId={col.instanceId}
                  customDragHandle
                  hasInteractiveChildren
                  spacing="s"
                >
                  {(provided) => (
                    <ColumnCard
                      column={col}
                      dragHandleProps={provided.dragHandleProps}
                      onUpdate={(instanceId, props) =>
                        dispatch({ type: 'UPDATE_COLUMN_PROPS', instanceId, props })
                      }
                      onRemove={(instanceId) => dispatch({ type: 'REMOVE_COLUMN', instanceId })}
                      onRemoveAction={(instanceId) =>
                        dispatch({ type: 'REMOVE_ACTION', instanceId })
                      }
                      warning={
                        col.type === 'actions' &&
                        !item.onEdit &&
                        !item.onDelete &&
                        !item.onInspect &&
                        !col.actions.some((a) => !['edit', 'delete', 'inspect'].includes(a.type))
                          ? 'This column is hidden because no item actions (onEdit, onDelete, onInspect) are configured on the provider and no custom actions are present.'
                          : undefined
                      }
                    />
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </div>

          <JsxTag name="ContentListTable" closing indent={1} />
        </>
      )}

      {/* ── Footer (child of Provider) ───────────────────────────── */}
      <JsxTag name="ContentListFooter" selfClosing indent={1} />
      <JsxTag name="ContentListProvider" closing indent={0} />
    </div>
  );
};
