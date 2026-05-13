/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Step, WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps, getBuiltInStepDefinition } from '@kbn/workflows';
import { getBaseConnectorType } from '../../shared/ui/step_icons/get_base_connector_type';
import { StepIcon } from '../../shared/ui/step_icons/step_icon';
import { PopoverItems } from '../worflows_triggers_list/popover_items';

// Lazy-load the preview to keep `@xyflow/react` out of the list page bundle
// until the user actually hovers a row.
const WorkflowGraphPreviewLazy = React.lazy(async () => {
  const m = await import('@kbn/workflows-ui');
  return { default: m.WorkflowGraphPreview };
});

interface WorkflowsStepTypesListProps {
  steps: Step[];
  /**
   * Full parsed workflow definition. When provided and the viewport is wide
   * enough, hovering the icon row opens a popover with a compact graph
   * preview.
   */
  workflow?: WorkflowYaml | null;
}

const HOVER_CLOSE_DELAY_MS = 150;
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 240;

const ICON_SIZE = 16;
const ICON_GAP = 8;
const OVERFLOW_BADGE_WIDTH = 36;
const MAX_VISIBLE_ICONS = 6;

const stepTypesListStyles = {
  container: css({
    width: '100%',
    overflow: 'hidden',
  }),
  iconGroup: css({
    flexWrap: 'nowrap',
  }),
};

const getStepTypeLabel = (stepType: string): string => {
  const definition = getBuiltInStepDefinition(stepType);
  if (definition?.label) {
    return definition.label;
  }
  return stepType;
};

export const calculateVisibleIconsCount = (containerWidth: number, totalIcons: number): number => {
  if (totalIcons === 0) {
    return 0;
  }
  if (containerWidth <= 0) {
    return 1;
  }

  const capped = Math.min(totalIcons, MAX_VISIBLE_ICONS);
  const iconSlot = ICON_SIZE + ICON_GAP;
  const needsBadge = capped < totalIcons;

  if (!needsBadge) {
    const allFit = capped * iconSlot - ICON_GAP;
    if (containerWidth >= allFit) {
      return totalIcons;
    }
  }

  const availableForIcons = containerWidth - OVERFLOW_BADGE_WIDTH - ICON_GAP;
  if (availableForIcons < iconSlot) {
    return 1;
  }
  return Math.max(1, Math.min(Math.floor(availableForIcons / iconSlot), capped));
};

export const WorkflowsStepTypesList = ({ steps, workflow }: WorkflowsStepTypesListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNarrow = useIsWithinBreakpoints(['xs', 's']);
  const canShowPreview = !!workflow && (workflow.steps ?? []).length > 0 && !isNarrow;

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openPreview = useCallback(() => {
    if (!canShowPreview) return;
    cancelClose();
    setIsPreviewOpen(true);
  }, [canShowPreview, cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimeoutRef.current = setTimeout(() => {
      setIsPreviewOpen(false);
      closeTimeoutRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const uniqueBaseTypes = useMemo(() => {
    const allSteps = collectAllSteps(steps);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const step of allSteps) {
      const baseType = getBaseConnectorType(step.type);
      if (!seen.has(baseType)) {
        seen.add(baseType);
        result.push(baseType);
      }
    }
    return result;
  }, [steps]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || uniqueBaseTypes.length === 0) {
      return;
    }

    const update = () => {
      const width = container.getBoundingClientRect().width;
      if (width > 0) {
        setVisibleCount(calculateVisibleIconsCount(width, uniqueBaseTypes.length));
      }
    };

    const rafId = requestAnimationFrame(update);
    const observer = new ResizeObserver(() => requestAnimationFrame(update));
    observer.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [uniqueBaseTypes.length]);

  if (uniqueBaseTypes.length === 0) {
    return null;
  }

  const displayCount = visibleCount ?? uniqueBaseTypes.length;
  const visibleItems = uniqueBaseTypes.slice(0, displayCount);
  const hasOverflow = displayCount < uniqueBaseTypes.length;

  const iconRow = (
    <div
      ref={containerRef}
      css={stepTypesListStyles.container}
      onMouseEnter={openPreview}
      onMouseLeave={scheduleClose}
      onFocus={openPreview}
      onBlur={scheduleClose}
      data-test-subj="workflowsStepTypesList"
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap={false}
        css={stepTypesListStyles.iconGroup}
      >
        {visibleItems.map((baseType) => (
          <EuiFlexItem grow={false} key={baseType}>
            <StepIcon
              stepType={baseType}
              executionStatus={undefined}
              size="m"
              title={getStepTypeLabel(baseType)}
            />
          </EuiFlexItem>
        ))}
        {hasOverflow && (
          <EuiFlexItem grow={false}>
            <PopoverItems
              items={uniqueBaseTypes}
              popoverTitle={i18n.translate('workflows.stepTypesList.title', {
                defaultMessage: 'Step types',
              })}
              popoverButtonTitle={
                displayCount === 0
                  ? uniqueBaseTypes.length.toString()
                  : `+${(uniqueBaseTypes.length - displayCount).toString()}`
              }
              dataTestPrefix="stepTypes"
              renderItem={(baseType, idx) => (
                <EuiFlexGroup
                  key={`${baseType}-${idx}`}
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <StepIcon stepType={baseType} executionStatus={undefined} size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{getStepTypeLabel(baseType)}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );

  if (!canShowPreview) return iconRow;

  return (
    <EuiPopover
      isOpen={isPreviewOpen}
      closePopover={() => setIsPreviewOpen(false)}
      anchorPosition="rightCenter"
      panelPaddingSize="none"
      hasArrow
      ownFocus={false}
      button={iconRow}
      data-test-subj="workflowsStepTypesListPreviewPopover"
    >
      <div
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        css={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      >
        <React.Suspense
          fallback={
            <div
              css={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EuiLoadingSpinner size="m" />
            </div>
          }
        >
          {workflow && (
            <WorkflowGraphPreviewLazy
              workflow={workflow}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
            />
          )}
        </React.Suspense>
      </div>
    </EuiPopover>
  );
};
