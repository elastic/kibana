/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import type { DraggableProvided } from '@hello-pangea/dnd';
import React from 'react';

const CHIP_HEIGHT = 34;

/**
 * Compact reorder clone — same elevated chip look as the field-editor
 * expression-builder drag ghost (icon/label chip, not the full accordion card).
 */
export function SchemaListDragClone({
  name,
  typeLabel,
  provided,
}: {
  readonly name: string;
  readonly typeLabel: string;
  readonly provided: DraggableProvided;
}) {
  const { euiTheme } = useEuiTheme();
  const displayName = name.trim() || '—';

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={provided.draggableProps.style}
      data-test-subj="schemaListDragClone"
    >
      {/* Inner wrapper owns scale so hello-pangea's translate transform is preserved. */}
      <div
        css={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          height: CHIP_HEIGHT,
          maxWidth: 280,
          width: 'max-content',
          padding: `0 ${euiTheme.size.s}`,
          boxSizing: 'border-box',
          color: euiTheme.colors.textParagraph,
          // Match expression-builder ghost: elevated chip over the list.
          background: euiTheme.colors.backgroundBasePlain,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.28)',
          overflow: 'hidden',
          pointerEvents: 'none',
          transform: 'scale(0.96)',
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none',
          },
        }}
      >
        <EuiText size="s" css={{ minWidth: 0 }}>
          <code
            css={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </code>
        </EuiText>
        <EuiText size="s" color="subdued" css={{ flexShrink: 0 }}>
          · {typeLabel}
        </EuiText>
      </div>
    </div>
  );
}
