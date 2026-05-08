/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { type Node, useReactFlow } from '@xyflow/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

interface WorkflowGraphBottomBarProps {
  searchTerm: string;
  onSearchChange: (next: string) => void;
  onSearchUsed?: () => void;
  triggerNodeIds: string[];
  leafNodeIds: string[];
  onJumpTo: (nodeId: string) => void;
}

export function WorkflowGraphBottomBar({
  searchTerm,
  onSearchChange,
  onSearchUsed,
  triggerNodeIds,
  leafNodeIds,
  onJumpTo,
}: WorkflowGraphBottomBarProps) {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView, getNodes, setCenter, getZoom } = useReactFlow();
  const [refsOpen, setRefsOpen] = useState(false);
  const cycleIdxRef = useRef(0);

  const reportedSearchUsedRef = useRef(false);
  useEffect(() => {
    if (searchTerm.trim().length === 0) {
      reportedSearchUsedRef.current = false;
      return;
    }
    if (!reportedSearchUsedRef.current) {
      reportedSearchUsedRef.current = true;
      onSearchUsed?.();
    }
  }, [searchTerm, onSearchUsed]);

  const cycleSearch = useCallback(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const matches = (getNodes() as Node[]).filter((n) => {
      const data = n.data as Record<string, unknown>;
      return (
        typeof data.label === 'string' &&
        ((data.label as string).toLowerCase().includes(term) ||
          (typeof data.stepType === 'string' &&
            (data.stepType as string).toLowerCase().includes(term)))
      );
    });
    if (matches.length === 0) return;
    cycleIdxRef.current = (cycleIdxRef.current + 1) % matches.length;
    const target = matches[cycleIdxRef.current];
    setCenter(target.position.x + 100, target.position.y + 30, {
      zoom: getZoom(),
      duration: 300,
    });
  }, [searchTerm, getNodes, setCenter, getZoom]);

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow
      css={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        background: euiTheme.colors.backgroundBasePlain,
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      }}
      data-test-subj="workflowGraphBottomBar"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="minusInCircle"
            aria-label={i18n.translate('workflowsUi.graph.zoomOut', { defaultMessage: 'Zoom out' })}
            onClick={() => zoomOut({ duration: 200 })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="plusInCircle"
            aria-label={i18n.translate('workflowsUi.graph.zoomIn', { defaultMessage: 'Zoom in' })}
            onClick={() => zoomIn({ duration: 200 })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="fullScreen"
            aria-label={i18n.translate('workflowsUi.graph.fit', { defaultMessage: 'Fit to view' })}
            onClick={() => fitView({ padding: 0.2, duration: 250 })}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ width: 200 }}>
          <EuiFieldSearch
            compressed
            placeholder={i18n.translate('workflowsUi.graph.searchPlaceholder', {
              defaultMessage: 'Search steps…',
            })}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={cycleSearch}
            data-test-subj="workflowGraphSearch"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={refsOpen}
            closePopover={() => setRefsOpen(false)}
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="list"
                onClick={() => setRefsOpen((v) => !v)}
                data-test-subj="workflowGraphReferences"
              >
                {i18n.translate('workflowsUi.graph.references', { defaultMessage: 'References' })}
              </EuiButtonEmpty>
            }
          >
            <div css={{ minWidth: 220, maxHeight: 320, overflowY: 'auto' }}>
              <EuiListGroup
                size="s"
                listItems={[
                  ...triggerNodeIds.map((id) => ({
                    label: `Trigger: ${id}`,
                    onClick: () => {
                      setRefsOpen(false);
                      onJumpTo(id);
                    },
                  })),
                  ...leafNodeIds.map((id) => ({
                    label: `Leaf: ${id}`,
                    onClick: () => {
                      setRefsOpen(false);
                      onJumpTo(id);
                    },
                  })),
                ]}
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
