/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ImpactIssue, ImpactStatus } from '../../../../common/lib/workflow_dependents/types';

type StatusColor = 'danger' | 'warning' | 'subdued' | 'success';

const STATUS_COLORS: Record<ImpactStatus, StatusColor> = {
  breaking: 'danger',
  warning: 'warning',
  alreadyBroken: 'danger',
  unknown: 'subdued',
  safe: 'success',
};

const STATUS_ICONS: Record<ImpactStatus, string> = {
  breaking: 'errorFill',
  warning: 'warningFill',
  alreadyBroken: 'errorFill',
  unknown: 'question',
  safe: 'checkCircleFill',
};

export interface CardProblem {
  key: string;
  severity: ImpactIssue['severity'];
  message: string;
}

export interface CardDetail {
  title: string;
  /** Rendered as code chips; an empty list shows `emptyText` instead. */
  items: readonly string[];
  emptyText: string;
}

export interface WorkflowLinkCardProps {
  name: string;
  href?: string;
  isTurnedOff?: boolean;
  status: ImpactStatus;
  statusLabel: string;
  verdict: string;
  problems: readonly CardProblem[];
  earlierProblems: readonly CardProblem[];
  notes: readonly string[];
  details: readonly CardDetail[];
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const ProblemList = ({
  problems,
  isMuted = false,
}: {
  problems: readonly CardProblem[];
  isMuted?: boolean;
}) => (
  <EuiFlexGroup direction="column" gutterSize="xs">
    {problems.map(({ key, severity, message }) => (
      <EuiFlexItem key={key}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={STATUS_ICONS[severity]}
              color={isMuted ? 'subdued' : STATUS_COLORS[severity]}
              size="s"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color={isMuted ? 'subdued' : 'default'}>
              {message}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const DetailValue = ({ items, emptyText }: Pick<CardDetail, 'items' | 'emptyText'>) =>
  items.length === 0 ? (
    <EuiText size="xs" color="subdued">
      {emptyText}
    </EuiText>
  ) : (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {items.map((item) => (
        <EuiFlexItem key={item} grow={false}>
          <EuiCode>{item}</EuiCode>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

/** Expandable card that explains how one workflow runs another and whether that still works. */
export const WorkflowLinkCard = React.forwardRef<HTMLDivElement, WorkflowLinkCardProps>(
  (
    {
      name,
      href,
      isTurnedOff = false,
      status,
      statusLabel,
      verdict,
      problems,
      earlierProblems,
      notes,
      details,
      isOpen,
      onToggle,
    },
    ref
  ) => {
    const accordionId = useGeneratedHtmlId({ prefix: 'workflowLinkCard' });

    return (
      <div ref={ref}>
        <EuiPanel hasBorder paddingSize="s" data-test-subj="workflowLinkCard">
          <EuiAccordion
            id={accordionId}
            forceState={isOpen ? 'open' : 'closed'}
            onToggle={onToggle}
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiHealth color={STATUS_COLORS[status]}>
                    <strong>{name}</strong>
                  </EuiHealth>
                </EuiFlexItem>
                {isTurnedOff && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.translate('workflows.dependents.card.turnedOff', {
                        defaultMessage: 'Turned off',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            extraAction={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color={STATUS_COLORS[status]}>
                    {statusLabel}
                  </EuiText>
                </EuiFlexItem>
                {href && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('workflows.dependents.card.open', {
                        defaultMessage: 'Open in a new tab',
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="external"
                        href={href}
                        target="_blank"
                        aria-label={i18n.translate('workflows.dependents.card.openAria', {
                          defaultMessage: 'Open {name} in a new tab',
                          values: { name },
                        })}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            paddingSize="s"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={STATUS_ICONS[status]}
                  color={STATUS_COLORS[status]}
                  size="m"
                  aria-hidden={true}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" data-test-subj="workflowLinkCardVerdict">
                  <strong>{verdict}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            {problems.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <ProblemList problems={problems} />
              </>
            )}

            {earlierProblems.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  {problems.length > 0
                    ? i18n.translate('workflows.dependents.card.alsoBrokenBefore', {
                        defaultMessage: 'Also broken before your changes:',
                      })
                    : i18n.translate('workflows.dependents.card.brokenBefore', {
                        defaultMessage: 'Already broken before your changes:',
                      })}
                </EuiText>
                <EuiSpacer size="xs" />
                <ProblemList problems={earlierProblems} isMuted />
              </>
            )}

            {notes.map((note) => (
              <React.Fragment key={note}>
                <EuiSpacer size="s" />
                <EuiText size="xs">{note}</EuiText>
              </React.Fragment>
            ))}

            <EuiSpacer size="m" />
            <EuiDescriptionList
              type="responsiveColumn"
              compressed
              columnWidths={[1, 2]}
              listItems={details.map(({ title, items, emptyText }) => ({
                title,
                description: <DetailValue items={items} emptyText={emptyText} />,
              }))}
              data-test-subj="workflowLinkCardDetails"
            />
          </EuiAccordion>
        </EuiPanel>
      </div>
    );
  }
);
WorkflowLinkCard.displayName = 'WorkflowLinkCard';
