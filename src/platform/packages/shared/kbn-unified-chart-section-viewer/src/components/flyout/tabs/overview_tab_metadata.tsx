/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiDescriptionList, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import React, { useMemo } from 'react';
import { getUnitLabel } from '../../../common/utils';
import type { ParsedMetricItem } from '../../../types';
import { BadgeGroup, MetricTypeBadge } from '../components';

const LABEL_WIDTH_MULTIPLIER = 11.25;

export interface OverviewTabMetadataProps {
  metricItem: ParsedMetricItem;
}

export const OverviewTabMetadata = ({ metricItem }: OverviewTabMetadataProps) => {
  const { euiTheme } = useEuiTheme();

  const { rows, labelMinWidthPx } = useMemo(() => {
    const labelMinWidthPxInner = euiTheme.base * LABEL_WIDTH_MULTIPLIER;

    const title = (text: string) => (
      <EuiText size="xs">
        <strong>{text}</strong>
      </EuiText>
    );

    const rowsInner: Array<{
      title: NonNullable<React.ReactNode>;
      description: NonNullable<React.ReactNode>;
    }> = [
      {
        title: title(
          i18n.translate('metricsExperience.overviewTab.strong.dataStreamLabel', {
            defaultMessage: 'Data stream',
          })
        ),
        description: (
          <EuiText
            color="primary"
            size="s"
            css={css`
              word-break: break-word;
              overflow-wrap: anywhere;
            `}
          >
            {metricItem.dataStream ?? ''}
          </EuiText>
        ),
      },
      {
        title: title(
          i18n.translate('metricsExperience.overviewTab.strong.fieldTypeLabel', {
            defaultMessage: 'Field type',
          })
        ),
        description: (
          <BadgeGroup
            items={metricItem.fieldTypes}
            isNoValue={(fieldType) => fieldType === ES_FIELD_TYPES.NULL}
            renderItem={(fieldType, index) => (
              <EuiBadge key={`${fieldType}-${index}`}>{fieldType}</EuiBadge>
            )}
          />
        ),
      },
      {
        title: title(
          i18n.translate('metricsExperience.overviewTab.strong.metricUnitLabel', {
            defaultMessage: 'Metric unit',
          })
        ),
        description: (
          <div data-test-subj="metricsExperienceFlyoutOverviewTabMetricUnitLabel">
            <BadgeGroup
              items={metricItem.units}
              renderItem={(unit, index) => (
                <EuiBadge key={`${unit}-${index}`}>{getUnitLabel({ unit })}</EuiBadge>
              )}
            />
          </div>
        ),
      },
      {
        title: title(
          i18n.translate('metricsExperience.overviewTab.strong.metricTypeLabel', {
            defaultMessage: 'Metric type',
          })
        ),
        description: (
          <div data-test-subj="metricsExperienceFlyoutOverviewTabMetricTypeLabel">
            <BadgeGroup
              items={metricItem.metricTypes}
              renderItem={(metricType, index) => (
                <MetricTypeBadge key={`${metricType}-${index}`} instrument={metricType} />
              )}
            />
          </div>
        ),
      },
    ];

    return { rows: rowsInner, labelMinWidthPx: labelMinWidthPxInner };
  }, [
    euiTheme.base,
    metricItem.dataStream,
    metricItem.fieldTypes,
    metricItem.metricTypes,
    metricItem.units,
  ]);

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      css={css`
        padding: ${euiTheme.size.xs} ${euiTheme.size.m};
      `}
    >
      <EuiDescriptionList
        compressed
        type="column"
        align="left"
        columnWidths={[`${labelMinWidthPx}px`, '1fr']}
        listItems={rows}
        data-test-subj="metricsExperienceFlyoutOverviewTabDescriptionList"
        titleProps={{
          css: css`
            min-width: ${labelMinWidthPx}px;
            padding: ${euiTheme.size.s} ${euiTheme.size.xs};
            display: flex;
            align-items: center;
          `,
        }}
        descriptionProps={{
          css: css`
            min-width: 0;
            padding: ${euiTheme.size.s} ${euiTheme.size.xs};
          `,
        }}
        // TODO: https://github.com/elastic/kibana/issues/260002
        css={css`
          align-items: stretch;
          row-gap: ${euiTheme.size.xxs};
          column-gap: 0;

          & > * {
            border-bottom: ${euiTheme.border.thin};
          }
          & > *:nth-last-child(-n + 2) {
            border-bottom: none;
          }
        `}
      />
    </EuiPanel>
  );
};
