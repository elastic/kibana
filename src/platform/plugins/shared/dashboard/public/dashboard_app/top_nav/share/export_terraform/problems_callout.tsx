/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import type { LinkedResource, PanelSummary } from '@kbn/as-code-dashboard-terraform';
import type { DashboardTerraformResponseBody } from '../../../../../server';
import type { SanitizeDetails } from './use_terraform_export';

export interface ProblemsInput {
  conversion: DashboardTerraformResponseBody;
  sanitized: SanitizeDetails;
  isDirty: boolean;
  isSaved: boolean;
  /** The tag resources the module writes for the chosen mode. */
  exportedTags: readonly LinkedResource[];
}

type Severity = 'danger' | 'warning' | 'info';

export interface Problem {
  key: string;
  severity: Severity;
  content: ReactNode;
}

const icons: Record<Severity, { type: string; color: string }> = {
  danger: { type: 'error', color: 'danger' },
  warning: { type: 'warning', color: 'warning' },
  info: { type: 'info', color: 'subdued' },
};

const panelName = ({ path, type, title }: PanelSummary): string => {
  const panelType =
    type ??
    i18n.translate('dashboard.exportTerraform.problems.unknownPanelTypeLabel', {
      defaultMessage: 'unknown type',
    });
  return title === undefined
    ? i18n.translate('dashboard.exportTerraform.problems.untitledPanelLabel', {
        defaultMessage: '{path} ({type})',
        values: { path, type: panelType },
      })
    : i18n.translate('dashboard.exportTerraform.problems.titledPanelLabel', {
        defaultMessage: '“{title}” ({type})',
        values: { title, type: panelType },
      });
};

const notExported = (panel: string): ReactNode => (
  <FormattedMessage
    id="dashboard.exportTerraform.problems.skippedPanelDescription"
    defaultMessage="Panel {panel} is not exported."
    values={{ panel }}
  />
);

const countByKind = (items: readonly AsCodeRelatedItem[]): Array<[string, number]> => {
  const counts = new Map<string, number>();
  for (const { type_label: kind } of items) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return [...counts];
};

/** What did not export cleanly, most severe first; empty when everything is exported. */
export const listProblems = ({
  conversion,
  sanitized,
  isDirty,
  isSaved,
  exportedTags,
}: ProblemsInput): Problem[] => {
  const {
    skipped_panels: skippedPanels,
    partial_panels: partialPanels,
    json_panels: jsonPanels,
    dropped_fields: droppedFields,
    tag_resource: tagResource,
  } = conversion;
  const { warnings = [] } = sanitized;
  // Exported tags are not among the objects the module only refers to.
  const exportedTagIds = new Set(exportedTags.map(({ id }) => id));
  const allRelatedItems = sanitized.related_items ?? [];
  const relatedItems = allRelatedItems.filter(
    ({ type, id }) => type !== 'tag' || !exportedTagIds.has(id)
  );
  const exportedTagCount = allRelatedItems.length - relatedItems.length;
  const relatedItemsCount =
    (sanitized.related_items_count ?? allRelatedItems.length) - exportedTagCount;
  const droppedInPanels = new Set(partialPanels.flatMap((panel) => panel.dropped_fields));

  // The sanitize step leaves out panels the Dashboards API has no schema for, before conversion.
  const droppedPanels: Problem[] = [];
  const otherWarnings: Problem[] = [];
  warnings.forEach((warning, i) => {
    if (warning.type !== 'dropped_panel') {
      otherWarnings.push({ key: `sanitize:${i}`, severity: 'warning', content: warning.message });
      return;
    }
    const { panel_type: type, panel_config: config } = warning;
    const { title } = config;
    droppedPanels.push({
      key: `dropped-panel:${i}`,
      severity: 'danger',
      content:
        typeof title === 'string' ? (
          notExported(panelName({ path: '', type, title }))
        ) : (
          <FormattedMessage
            id="dashboard.exportTerraform.problems.untitledDroppedPanelDescription"
            defaultMessage="A panel of type {type} is not exported."
            values={{ type }}
          />
        ),
    });
  });

  return [
    ...droppedPanels,
    ...skippedPanels.map((panel) => ({
      key: `skipped:${panel.path}`,
      severity: 'danger' as const,
      content: notExported(panelName(panel)),
    })),
    ...partialPanels.map((panel) => ({
      key: `partial:${panel.path}`,
      severity: 'warning' as const,
      content: (
        <>
          <FormattedMessage
            id="dashboard.exportTerraform.problems.partialPanelDescription"
            defaultMessage="Panel {panel} is exported partially. Dropped:"
            values={{ panel: panelName(panel) }}
          />
          <ul>
            {panel.dropped_fields.map((path) => (
              <li key={path}>
                <EuiCode>{path}</EuiCode>
              </li>
            ))}
          </ul>
        </>
      ),
    })),
    ...droppedFields
      .filter((path) => !droppedInPanels.has(path))
      .map((path) => ({
        key: `dropped:${path}`,
        severity: 'warning' as const,
        content: (
          <FormattedMessage
            id="dashboard.exportTerraform.problems.droppedFieldDescription"
            defaultMessage="Dropped {path}: the resource has no attribute for it."
            values={{ path: <EuiCode>{path}</EuiCode> }}
          />
        ),
      })),
    ...jsonPanels.map((panel) => ({
      key: `json:${panel.path}`,
      severity: 'info' as const,
      content: (
        <FormattedMessage
          id="dashboard.exportTerraform.problems.jsonPanelDescription"
          defaultMessage="Panel {panel} is exported as a JSON string."
          values={{ panel: panelName(panel) }}
        />
      ),
    })),
    ...(exportedTags.length
      ? [
          {
            key: 'created-tags',
            severity: 'warning' as const,
            content: (
              <>
                {i18n.translate('dashboard.exportTerraform.problems.createdTagsDescription', {
                  defaultMessage:
                    'A new copy creates {count, plural, one {# tag} other {# tags}}. Kibana refuses a tag whose name already exists, so apply fails if the target already has a tag with one of these names:',
                  values: { count: exportedTags.length },
                })}
                <ul>
                  {exportedTags.map(({ name, label }) => (
                    <li key={name}>{label}</li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            key: 'tags-target-version',
            severity: 'info' as const,
            content: i18n.translate(
              'dashboard.exportTerraform.problems.tagsTargetVersionDescription',
              {
                defaultMessage:
                  'The tags file needs Kibana {version} or later where Terraform applies it.',
                values: { version: tagResource.min_kibana_version },
              }
            ),
          },
        ]
      : []),
    ...otherWarnings,
    ...(isDirty || !isSaved
      ? [
          {
            key: 'unsaved',
            severity: 'info' as const,
            content: isSaved
              ? i18n.translate('dashboard.exportTerraform.problems.unsavedChangesDescription', {
                  defaultMessage:
                    'This export includes unsaved changes. The files differ from the saved dashboard. If you adopt it, the first plan shows these changes.',
                })
              : i18n.translate('dashboard.exportTerraform.problems.unsavedDashboardDescription', {
                  defaultMessage:
                    'This export includes unsaved changes. This dashboard has never been saved, so it can only be exported as a new copy. Save it to adopt it.',
                }),
          },
        ]
      : []),
    ...(relatedItemsCount > 0
      ? [
          {
            key: 'references',
            severity: 'info' as const,
            content: (
              <>
                {i18n.translate('dashboard.exportTerraform.problems.referencesDescription', {
                  defaultMessage:
                    'The dashboard refers to {count, plural, one {# object that is} other {# objects that are}} not exported. They must exist where Terraform runs.',
                  values: { count: relatedItemsCount },
                })}
                <ul>
                  {countByKind(relatedItems).map(([kind, count]) => (
                    <li key={kind}>
                      {i18n.translate(
                        'dashboard.exportTerraform.problems.referenceKindCountLabel',
                        {
                          defaultMessage: '{kind}: {count}',
                          values: { kind, count },
                        }
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
        ]
      : []),
  ];
};

const summary = (problems: number, notes: number): string => {
  if (!problems) {
    return i18n.translate('dashboard.exportTerraform.problems.notesSummaryDescription', {
      defaultMessage: '{notes, plural, one {# note} other {# notes}} about this export.',
      values: { notes },
    });
  }
  return notes
    ? i18n.translate('dashboard.exportTerraform.problems.problemsAndNotesSummaryDescription', {
        defaultMessage:
          '{problems, plural, one {# problem} other {# problems}} and {notes, plural, one {# note} other {# notes}}.',
        values: { problems, notes },
      })
    : i18n.translate('dashboard.exportTerraform.problems.problemsSummaryDescription', {
        defaultMessage: '{problems, plural, one {# problem} other {# problems}}.',
        values: { problems },
      });
};

export interface ProblemsCalloutProps {
  problems: readonly Problem[];
  onDismiss: () => void;
}

/** Lists problems and notes in one callout, a warning callout when any entry is a problem. */
export const ProblemsCallout = ({
  problems,
  onDismiss,
}: ProblemsCalloutProps): React.JSX.Element => {
  const accordionId = useGeneratedHtmlId({ prefix: 'dashboardTerraformExportProblems' });
  const [isExpanded, setIsExpanded] = useState(false);
  const problemCount = problems.filter(({ severity }) => severity !== 'info').length;
  const Callout = problemCount ? KbnWarningCallout : KbnInfoCallout;
  return (
    <Callout
      size="s"
      title={i18n.translate('dashboard.exportTerraform.problems.title', {
        defaultMessage: 'Review this export',
      })}
      text={summary(problemCount, problems.length - problemCount)}
      onDismiss={onDismiss}
      data-test-subj="dashboardTerraformExportProblems"
    >
      <EuiAccordion
        id={accordionId}
        initialIsOpen={false}
        onToggle={setIsExpanded}
        paddingSize="s"
        buttonContent={
          isExpanded
            ? i18n.translate('dashboard.exportTerraform.problems.hideDetailsButtonLabel', {
                defaultMessage: 'Hide details',
              })
            : i18n.translate('dashboard.exportTerraform.problems.showDetailsButtonLabel', {
                defaultMessage: 'Show details',
              })
        }
      >
        <ul
          aria-label={i18n.translate('dashboard.exportTerraform.problems.listAriaLabel', {
            defaultMessage: 'Problems',
          })}
          css={{ maxHeight: 'min(240px, 20vh)', overflowY: 'auto' }}
        >
          {problems.map(({ key, severity, content }) => (
            <li key={key}>
              <EuiFlexGroup gutterSize="xs" alignItems="baseline" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon {...icons[severity]} size="s" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">
                    <div>{content}</div>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </li>
          ))}
        </ul>
      </EuiAccordion>
    </Callout>
  );
};
