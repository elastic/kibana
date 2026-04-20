/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiInlineEditText,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { ActiveColumn, PropDefinition } from './playground_state';
import { ACTION_DEFINITIONS, COLUMN_DEFINITIONS } from './playground_state';
import { BASE_FONT } from './jsx_tag';

// =============================================================================
// Styles
// =============================================================================

const nestedContentCss = css({ paddingLeft: 24 });

const useJsxLabelStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    bracket: css({ color: euiTheme.colors.textSubdued }),
    tag: css({ color: euiTheme.colors.primaryText, fontWeight: 600 }),
    wrapper: css({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
    }),
  };
};

// =============================================================================
// Types
// =============================================================================

export interface ColumnCardProps {
  column: ActiveColumn;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onUpdate: (instanceId: string, props: Record<string, unknown>) => void;
  onRemove: (instanceId: string) => void;
  onRemoveAction?: (instanceId: string) => void;
  /** Optional warning message shown as a tooltip with a warning icon. */
  warning?: string;
}

// =============================================================================
// PropEditor
// =============================================================================

interface PropEditorProps {
  propDef: PropDefinition;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

const PropEditor = ({ propDef, value, onChange }: PropEditorProps) => {
  const id = useGeneratedHtmlId({ prefix: `prop-${propDef.name}` });

  if (propDef.type === 'boolean') {
    return (
      <EuiCheckbox
        id={id}
        label={propDef.label}
        checked={Boolean(value ?? propDef.defaultValue)}
        onChange={(e) => onChange(propDef.name, e.target.checked)}
      />
    );
  }

  return (
    <EuiInlineEditText
      inputAriaLabel={propDef.label}
      defaultValue={String(value ?? '')}
      onSave={(v) => onChange(propDef.name, v || undefined)}
      size="xs"
      placeholder={String(propDef.defaultValue || propDef.label)}
      readModeProps={{ style: BASE_FONT }}
      editModeProps={{ inputProps: { style: BASE_FONT } }}
    />
  );
};

// =============================================================================
// JsxLabel — inline `<ComponentName />` rendered in monospace.
// =============================================================================

const JsxLabel = ({ name }: { name: string }) => {
  const styles = useJsxLabelStyles();

  return (
    <span css={styles.wrapper}>
      <span css={styles.bracket}>{'<'}</span>
      <span css={styles.tag}>{name}</span>
      <span css={styles.bracket}>{' />'}</span>
    </span>
  );
};

// =============================================================================
// ColumnCard
// =============================================================================

/**
 * A draggable card representing an active column in the table.
 *
 * Styled after the [EUI drag-and-drop examples](https://eui.elastic.co/docs/components/display/drag-and-drop/)
 * with a custom drag handle, component label, and expandable prop editors.
 */
export const ColumnCard = ({
  column,
  dragHandleProps,
  onUpdate,
  onRemove,
  onRemoveAction,
  warning,
}: ColumnCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const definition = COLUMN_DEFINITIONS.find((d) => d.type === column.type);
  const label = definition?.label ?? column.type;
  const configurableProps = definition?.configurableProps ?? [];
  const hasProps = configurableProps.length > 0;
  const isActions = column.type === 'actions';

  const handlePropChange = useCallback(
    (name: string, value: unknown) => {
      onUpdate(column.instanceId, { ...column.props, [name]: value });
    },
    [column.instanceId, column.props, onUpdate]
  );

  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div {...(dragHandleProps ?? {})} aria-label="Drag handle">
            <EuiIcon type="grab" size="s" aria-hidden={true} />
          </div>
        </EuiFlexItem>

        <EuiFlexItem>
          <JsxLabel name={label} />
        </EuiFlexItem>

        {warning && (
          <EuiFlexItem grow={false}>
            <EuiIconTip type="warning" size="m" color="warning" content={warning} />
          </EuiFlexItem>
        )}

        {hasProps && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
              size="xs"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={() => setIsExpanded(!isExpanded)}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            size="xs"
            color="danger"
            aria-label={`Remove ${label}`}
            onClick={() => onRemove(column.instanceId)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded && hasProps && (
        <>
          <EuiSpacer size="s" />
          <div css={nestedContentCss}>
            {configurableProps.map((propDef) => (
              <PropEditor
                key={propDef.name}
                propDef={propDef}
                value={column.props[propDef.name]}
                onChange={handlePropChange}
              />
            ))}
          </div>
        </>
      )}

      {isActions && (
        <>
          <EuiSpacer size="s" />
          <div css={nestedContentCss}>
            <EuiDroppable droppableId="actions" type="ACTION" spacing="s">
              {column.actions.map((act, idx) => {
                const actDef = ACTION_DEFINITIONS.find((d) => d.type === act.type);
                return (
                  <EuiDraggable
                    key={act.instanceId}
                    index={idx}
                    draggableId={act.instanceId}
                    customDragHandle
                    hasInteractiveChildren
                    spacing="s"
                  >
                    {(provided) => (
                      <DraggableCard
                        label={actDef?.label ?? act.type}
                        dragHandleProps={provided.dragHandleProps}
                        onRemove={() => onRemoveAction?.(act.instanceId)}
                      />
                    )}
                  </EuiDraggable>
                );
              })}
            </EuiDroppable>
          </div>
        </>
      )}
    </EuiPanel>
  );
};

// =============================================================================
// DraggableCard — shared card for actions and filters.
// =============================================================================

export interface DraggableCardProps {
  label: string;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onRemove: () => void;
}

/**
 * A lightweight draggable card used for both action items inside
 * `Column.Actions` and toolbar filter items.
 */
export const DraggableCard = ({ label, dragHandleProps, onRemove }: DraggableCardProps) => (
  <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <div {...(dragHandleProps ?? {})} aria-label="Drag handle">
          <EuiIcon type="grab" size="s" aria-hidden={true} />
        </div>
      </EuiFlexItem>

      <EuiFlexItem>
        <JsxLabel name={label} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="cross"
          size="xs"
          color="danger"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
