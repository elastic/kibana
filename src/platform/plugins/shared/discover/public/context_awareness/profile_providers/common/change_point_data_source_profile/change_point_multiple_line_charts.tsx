/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { ForkBranchLabel } from '@kbn/esql-utils';
import type {
  LensEmbeddableInput,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import React from 'react';
import {
  ChangePointLensEmbeddable,
  changePointExperienceLensWrapperCss,
  changePointLensNestedChartWrapperCss,
  type ChangePointLensFetchSlice,
} from './change_point_lens_embeddable';

export interface ChangePointMultipleLineChartsProps {
  lens: LensPublicStart;
  multipleEntityMode: boolean;
  forkBranchLabels: ForkBranchLabel[] | undefined;
  /** Per-entity Lens attributes when multipleEntityMode */
  entityAttributesMap: Record<number, TypedLensByValueInput['attributes']>;
  /** Single-chart Lens attributes when not in multiple-entity mode (unused when multipleEntityMode) */
  lensAttributes: TypedLensByValueInput['attributes'] | null;
  fetchSlice: ChangePointLensFetchSlice;
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  onFilter?: LensEmbeddableInput['onFilter'];
}

/**
 * Multiple-line (and single line) Lens views for the change point chart section.
 */
export const ChangePointMultipleLineCharts: React.FC<ChangePointMultipleLineChartsProps> = ({
  lens,
  multipleEntityMode,
  forkBranchLabels,
  entityAttributesMap,
  lensAttributes,
  fetchSlice,
  onBrushEnd,
  onFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const chartCss = changePointExperienceLensWrapperCss(euiTheme);
  const nestedChartCss = changePointLensNestedChartWrapperCss();

  const isSingleChart = !multipleEntityMode || (forkBranchLabels?.length ?? 0) === 1;
  const chartEntities = forkBranchLabels ?? [];
  const gridColumns = isSingleChart ? 1 : 3;

  if (isSingleChart) {
    const attrs = multipleEntityMode ? entityAttributesMap[0] : lensAttributes;
    const entityLabel = chartEntities[0]?.branchLabel;
    if (!attrs) {
      return null;
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="none" css={css({ flex: 1, minHeight: 0 })}>
        <EuiFlexItem grow css={css({ minHeight: 0 })}>
          <ChangePointLensEmbeddable
            lens={lens}
            attributes={attrs}
            executionContextDescription="Discover change point chart"
            id={
              entityLabel
                ? `discover-change-point-entity-${entityLabel}`
                : 'discover-change-point-lens'
            }
            {...fetchSlice}
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
            syncCursor={true}
            syncTooltips={true}
            wrapperCss={chartCss}
            dataTestSubj="changePointExperienceLensLineChart"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiFlexGrid columns={gridColumns} css={css({ flex: 1, minHeight: 0 })}>
        {chartEntities.map((branch, entityIdx) => {
          const attrs = entityAttributesMap[entityIdx];
          if (!attrs) return null;
          const entityLabel = branch.branchLabel;
          return (
            <EuiFlexItem
              key={entityLabel}
              css={css({
                minHeight: 220,
                minWidth: 0,
              })}
            >
              <EuiPanel
                paddingSize="xs"
                hasBorder
                hasShadow={false}
                css={css({
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                })}
                data-test-subj={`changePointLineChart-${entityLabel}`}
              >
                <EuiFlexGroup
                  direction="column"
                  gutterSize="xs"
                  css={css({ flex: 1, minHeight: 0 })}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      css={css({
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      })}
                      title={entityLabel}
                    >
                      {entityLabel}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow
                    css={css({
                      minHeight: 0,
                      overflow: 'hidden',
                    })}
                  >
                    <ChangePointLensEmbeddable
                      lens={lens}
                      attributes={attrs}
                      executionContextDescription="Discover change point entity chart"
                      id={`discover-change-point-multiple-entity-${entityLabel}`}
                      {...fetchSlice}
                      onBrushEnd={onBrushEnd}
                      onFilter={onFilter}
                      syncCursor={true}
                      syncTooltips={true}
                      wrapperCss={nestedChartCss}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </>
  );
};
