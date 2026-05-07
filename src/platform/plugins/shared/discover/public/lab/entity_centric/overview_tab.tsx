/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EntityOverview, GoldenSignal } from './fake_entity_overview';

interface OverviewTabProps {
  readonly overview: EntityOverview;
}

export const OverviewTab = ({ overview }: OverviewTabProps) => {
  const summaryAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSummary' });
  const signalsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSignals' });
  const detailsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabDetails' });
  const ownershipAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabOwnership' });

  return (
    <>
      <EuiAccordion
        id={summaryAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('discover.entityCentricLab.flyout.overview.entitySummaryTitle', {
              defaultMessage: 'Entity Summary',
            })}
            adornment={<EuiIcon type="sparkles" color="accent" aria-hidden={true} />}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="entitySummary" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntitySummary"
      >
        <EntitySummaryCard overview={overview} />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={signalsAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('discover.entityCentricLab.flyout.overview.goldenSignalsTitle', {
              defaultMessage: 'Golden signals',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="goldenSignals" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewGoldenSignals"
      >
        <GoldenSignalsRow signals={overview.goldenSignals} />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={detailsAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('discover.entityCentricLab.flyout.overview.entityDetailsTitle', {
              defaultMessage: 'Entity details',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="entityDetails" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntityDetails"
      >
        <KeyValueGrid
          rows={overview.details}
          ariaLabel={i18n.translate(
            'discover.entityCentricLab.flyout.overview.entityDetailsAriaLabel',
            { defaultMessage: 'Entity details' }
          )}
        />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={ownershipAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('discover.entityCentricLab.flyout.overview.ownershipTitle', {
              defaultMessage: 'Ownership',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="ownership" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewOwnership"
      >
        <KeyValueGrid
          rows={overview.ownership}
          ariaLabel={i18n.translate(
            'discover.entityCentricLab.flyout.overview.ownershipAriaLabel',
            {
              defaultMessage: 'Ownership',
            }
          )}
        />
      </EuiAccordion>
    </>
  );
};

const SectionTitle = ({ title, adornment }: { title: string; adornment?: React.ReactNode }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {adornment ? <EuiFlexItem grow={false}>{adornment}</EuiFlexItem> : null}
  </EuiFlexGroup>
);

const SectionMenuButton = ({ sectionLabel }: { sectionLabel: string }) => (
  <EuiButtonIcon
    iconType="boxesVertical"
    color="text"
    aria-label={i18n.translate('discover.entityCentricLab.flyout.overview.sectionMenuAriaLabel', {
      defaultMessage: 'Open section actions',
    })}
    data-test-subj={`entityCentricLabSectionMenu-${sectionLabel}`}
  />
);

const EntitySummaryCard = ({ overview }: { overview: EntityOverview }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={css`
        background: linear-gradient(
          135deg,
          ${euiTheme.colors.lightShade} 0%,
          ${euiTheme.colors.body} 100%
        );
      `}
      data-test-subj="entityCentricLabEntitySummaryCard"
    >
      <EuiText size="s">
        <p>{overview.summary.text}</p>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('discover.entityCentricLab.flyout.overview.summaryGeneratedAt', {
              defaultMessage: 'Generated on {generatedAt}',
              values: { generatedAt: overview.summary.generatedAt },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            color="text"
            size="xs"
            aria-label={i18n.translate(
              'discover.entityCentricLab.flyout.overview.regenerateSummaryAriaLabel',
              { defaultMessage: 'Regenerate summary' }
            )}
            data-test-subj="entityCentricLabSummaryRegenerate"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const GoldenSignalsRow = ({ signals }: { signals: readonly GoldenSignal[] }) => (
  <EuiFlexGroup gutterSize="m" responsive={false} wrap>
    {signals.map((signal) => (
      <EuiFlexItem key={signal.id} style={{ minWidth: 160 }}>
        <GoldenSignalCard signal={signal} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const GoldenSignalCard = ({ signal }: { signal: GoldenSignal }) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    color={signal.color}
    paddingSize="m"
    data-test-subj={`entityCentricLabGoldenSignalCard-${signal.id}`}
  >
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>{signal.label}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="questionInCircle" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiText size="xs" color="subdued" textAlign="right">
      {signal.delta}
    </EuiText>
    <EuiText textAlign="right">
      <EuiTitle size="l">
        <span>{signal.value}</span>
      </EuiTitle>
    </EuiText>
  </EuiPanel>
);

const KeyValueGrid = ({
  rows,
  ariaLabel,
}: {
  rows: readonly { id: string; label: string; value: string }[];
  ariaLabel: string;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiFlexGrid columns={3} gutterSize="m" aria-label={ariaLabel}>
      {rows.map((row) => (
        <EuiFlexItem key={row.id}>
          <EuiText size="xs" color="subdued">
            {row.label}
          </EuiText>
          <EuiText size="s">
            <strong>{row.value}</strong>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  </EuiPanel>
);
