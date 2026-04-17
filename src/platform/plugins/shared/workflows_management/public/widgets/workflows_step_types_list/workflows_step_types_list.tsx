/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Step } from '@kbn/workflows';
import { collectAllSteps, getBuiltInStepDefinition } from '@kbn/workflows';
import { getBaseConnectorType } from '../../shared/ui/step_icons/get_base_connector_type';
import { getStepIconType } from '../../shared/ui/step_icons/get_step_icon_type';
import { PopoverItems } from '../worflows_triggers_list/popover_items';

interface WorkflowsStepTypesListProps {
  steps: Step[];
}

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

export const WorkflowsStepTypesList = ({ steps }: WorkflowsStepTypesListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

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

  return (
    <div ref={containerRef} css={stepTypesListStyles.container}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap={false}
        css={stepTypesListStyles.iconGroup}
      >
        {visibleItems.map((baseType) => (
          <EuiFlexItem grow={false} key={baseType}>
            <EuiIcon type={getStepIconType(baseType)} size="m" title={getStepTypeLabel(baseType)} />
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
                    <EuiIcon type={getStepIconType(baseType)} size="s" aria-hidden={true} />
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
};
