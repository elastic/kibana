/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LogRow } from './fake_entity_tabs';

interface LogDocumentFlyoutProps {
  readonly row: LogRow;
  readonly entityName: string;
  readonly currentIndex: number;
  readonly totalCount: number;
  readonly onClose: () => void;
  readonly onNavigate: (direction: 'prev' | 'next') => void;
}

type DocTab = 'overview' | 'attributes' | 'table' | 'json';

interface FieldRow {
  readonly field: string;
  readonly value: string;
}

const buildFields = (row: LogRow, entityName: string): readonly FieldRow[] => {
  const hash = entityName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return [
    { field: 'Service name', value: `opbeans-frontend-loadgen` },
    { field: 'Host name', value: entityName },
    {
      field: 'Orchestrator cluster name',
      value: `edge-lite-oblt`,
    },
    { field: 'Cloud provider', value: 'gcp' },
    { field: 'Cloud availability zone', value: `us-central1-c` },
    {
      field: 'Cloud instance ID',
      value: `${8750000000000 + hash * 1000000}`,
    },
    {
      field: 'Log path file',
      value: `/var/log/pods/default_opbeans-frontend-loadgen-${hash % 10000}...`,
    },
    { field: 'Dataset', value: 'generic.otel' },
    { field: 'Namespace', value: 'default' },
  ];
};

const buildJsonDoc = (row: LogRow, entityName: string): string => {
  return JSON.stringify(
    {
      _index: 'logs-generic.otel-default',
      _id: row.id,
      _source: {
        '@timestamp': row.timestamp,
        'body.text': row.summary,
        'service.name': 'opbeans-frontend-loadgen',
        'host.name': entityName,
        'cloud.provider': 'gcp',
        'cloud.availability_zone': 'us-central1-c',
        'data_stream.dataset': 'generic.otel',
        'data_stream.namespace': 'default',
        'log.level': row.severity.toLowerCase(),
      },
    },
    null,
    2
  );
};

export const LogDocumentFlyout = ({
  row,
  entityName,
  currentIndex,
  totalCount,
  onClose,
  onNavigate,
}: LogDocumentFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const [activeTab, setActiveTab] = useState<DocTab>('overview');
  const fields = useMemo(() => buildFields(row, entityName), [row, entityName]);
  const jsonDoc = useMemo(() => buildJsonDoc(row, entityName), [row, entityName]);
  const [aiExpanded, setAiExpanded] = useState(false);

  const fieldColumns = useMemo<Array<EuiBasicTableColumn<FieldRow>>>(
    () => [
      {
        field: 'field',
        name: '',
        width: '180px',
        render: (field: string) => (
          <EuiText size="xs" color="subdued">
            {field}
          </EuiText>
        ),
      },
      {
        field: 'value',
        name: '',
        render: (value: string) => (
          <EuiText size="xs">
            <EuiCode transparentBackground>{value}</EuiCode>
          </EuiText>
        ),
      },
    ],
    []
  );

  const handlePrev = useCallback(() => onNavigate('prev'), [onNavigate]);
  const handleNext = useCallback(() => onNavigate('next'), [onNavigate]);

  return (
    <EuiFlyoutResizable
      ownFocus={false}
      session="inherit"
      onClose={onClose}
      size="s"
      hideCloseButton
      aria-labelledby="logDocFlyoutTitle"
      data-test-subj="entityCentricLabLogDocumentFlyout"
    >
      <EuiFlyoutHeader css={css`padding-bottom: 0;`}>
        {/* Title row */}
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          gutterSize="s"
        >
          <EuiFlexItem>
            <EuiTitle size="s" id="logDocFlyoutTitle">
              <h2>
                {i18n.translate(
                  'entityCentricLabFlyout.flyout.logDoc.title',
                  { defaultMessage: 'Document' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="pin"
                  color="text"
                  aria-label="Pin"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  aria-label="Close"
                  onClick={onClose}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Navigation row */}
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowLeft"
                  color="text"
                  aria-label="Previous document"
                  onClick={handlePrev}
                  isDisabled={currentIndex <= 0}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate(
                    'entityCentricLabFlyout.flyout.logDoc.nav',
                    {
                      defaultMessage: '{current} of {total}',
                      values: { current: currentIndex + 1, total: totalCount },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowRight"
                  color="text"
                  aria-label="Next document"
                  onClick={handleNext}
                  isDisabled={currentIndex >= totalCount - 1}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  Actions:
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={jsonDoc}>
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copyClipboard"
                      color="text"
                      aria-label="Copy document"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Tabs */}
        <EuiTabs bottomBorder={false}>
          {(
            [
              { id: 'overview', label: 'Log overview' },
              { id: 'attributes', label: 'Attributes' },
              { id: 'table', label: 'Table' },
              { id: 'json', label: 'JSON' },
            ] as const
          ).map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {activeTab === 'overview' && (
          <>
            {/* Content breakdown */}
            <EuiAccordion
              id="logDocContentBreakdown"
              buttonContent={
                <EuiTitle size="xxs">
                  <span>Content breakdown</span>
                </EuiTitle>
              }
              initialIsOpen
            >
              <EuiSpacer size="s" />
              <EuiFlexGroup
                gutterSize="s"
                alignItems="baseline"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    body.text
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink>
                    <EuiText size="xs">Parse content in Streams</EuiText>
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem />
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {row.timestamp}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language="text"
                fontSize="s"
                paddingSize="m"
                isCopyable
              >
                {row.summary}
              </EuiCodeBlock>
            </EuiAccordion>

            <EuiSpacer size="m" />

            {/* Field table */}
            <EuiBasicTable<FieldRow>
              items={fields as FieldRow[]}
              columns={fieldColumns}
              tableLayout="auto"
              css={css`
                .euiTableHeaderCell { display: none; }
                .euiTableCellContent { padding: 4px 8px; }
              `}
            />

            <EuiSpacer size="m" />

            {/* Stream */}
            <EuiAccordion
              id="logDocStream"
              buttonContent={
                <EuiTitle size="xxs">
                  <span>Stream</span>
                </EuiTitle>
              }
              initialIsOpen
            >
              <EuiSpacer size="xs" />
              <EuiLink>logs-generic.otel-default</EuiLink>
            </EuiAccordion>

            <EuiSpacer size="m" />

            {/* Explain this log entry */}
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              css={css`
                cursor: pointer;
                &:hover {
                  background: ${euiTheme.colors.lightestShade};
                }
              `}
              onClick={() => setAiExpanded((prev) => !prev)}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      font-size: 20px;
                      line-height: 1;
                    `}
                  >
                    ✨
                  </span>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>Explain this log entry</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    Get helpful insights from our Elastic AI Agent
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType={aiExpanded ? 'arrowDown' : 'arrowRight'}
                    color="text"
                    aria-label="Expand AI explanation"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              {aiExpanded && (
                <>
                  <EuiHorizontalRule margin="s" />
                  <EuiTitle size="xs">
                    <h3>Log Analysis: Application Log Entry</h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <strong>What This Means</strong>
                    <p>
                      This log entry captures activity from the{' '}
                      <EuiCode transparentBackground>
                        opbeans-frontend-loadgen
                      </EuiCode>{' '}
                      service. It indicates an operation was executed during a
                      load testing scenario on host{' '}
                      <EuiCode transparentBackground>{entityName}</EuiCode>.
                    </p>
                    <strong>Source</strong>
                    <ul>
                      <li>
                        Service:{' '}
                        <EuiCode transparentBackground>
                          opbeans-frontend-loadgen
                        </EuiCode>
                      </li>
                      <li>
                        Timestamp:{' '}
                        <EuiCode transparentBackground>
                          {row.timestamp}
                        </EuiCode>
                      </li>
                      <li>Dataset: generic.otel</li>
                    </ul>
                    <strong>Recommended Actions</strong>
                    <ol>
                      <li>Check surrounding logs for the full context.</li>
                      <li>
                        Review errors for the service to identify recurring
                        failure patterns.
                      </li>
                      <li>
                        Go to <EuiLink>Discover</EuiLink> to query logs around{' '}
                        <EuiCode transparentBackground>
                          {row.timestamp.split(' ')[0]}
                        </EuiCode>{' '}
                        for the full exception context.
                      </li>
                    </ol>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        Was this helpful?
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty size="xs">👍 Yes</EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty size="xs">👎 No</EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem />
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty size="xs" iconType="discuss">
                        Start conversation
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </EuiPanel>
          </>
        )}

        {activeTab === 'attributes' && (
          <>
            <EuiDescriptionList compressed>
              {fields.map((f) => (
                <React.Fragment key={f.field}>
                  <EuiDescriptionListTitle>{f.field}</EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    <EuiCode transparentBackground>{f.value}</EuiCode>
                  </EuiDescriptionListDescription>
                </React.Fragment>
              ))}
            </EuiDescriptionList>
          </>
        )}

        {activeTab === 'table' && (
          <EuiBasicTable<FieldRow>
            items={[
              { field: '@timestamp', value: row.timestamp },
              { field: 'body.text', value: row.summary },
              { field: 'log.level', value: row.severity.toLowerCase() },
              ...fields,
            ] as FieldRow[]}
            columns={[
              { field: 'field', name: 'Field', width: '30%' },
              {
                field: 'value',
                name: 'Value',
                render: (v: string) => (
                  <EuiCode transparentBackground>{v}</EuiCode>
                ),
              },
            ]}
            tableLayout="auto"
          />
        )}

        {activeTab === 'json' && (
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="m"
            isCopyable
            overflowHeight={600}
          >
            {jsonDoc}
          </EuiCodeBlock>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
