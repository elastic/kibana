/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getCalledStatusLabel, getIssueMessage, getStatusLabel } from './translations';
import type { CardDetail, CardProblem, WorkflowLinkCardProps } from './workflow_link_card';
import type {
  CalledWorkflowImpact,
  CallSiteImpact,
  DependentImpact,
  ImpactIssue,
  ImpactStatus,
  UpstreamImpact,
} from '../../../../common/lib/workflow_dependents/types';

type CardContent = Omit<WorkflowLinkCardProps, 'href' | 'isOpen' | 'onToggle'>;

const MAX_VALUE_LENGTH = 40;

const formatValue = (value: unknown): string => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH - 1)}…` : text;
};

const unique = (values: string[]): string[] => [...new Set(values)];

const toProblems = (
  issues: readonly ImpactIssue[],
  childName: string,
  hasManySteps: boolean
): CardProblem[] =>
  [...issues]
    .sort((a, b) => Number(a.severity !== 'breaking') - Number(b.severity !== 'breaking'))
    .map((issue) => {
      const message = getIssueMessage(issue, childName);
      return {
        key: `${issue.stepName}:${issue.kind}:${issue.field}`,
        severity: issue.severity,
        message: hasManySteps
          ? i18n.translate('workflows.dependents.card.problemInStep', {
              defaultMessage: '{message} (step "{stepName}")',
              values: { message, stepName: issue.stepName },
            })
          : message,
      };
    });

const getUsageDetails = (callSites: readonly CallSiteImpact[], childName: string): CardDetail[] => {
  const isAllDynamic = callSites.length > 0 && callSites.every((site) => site.isDynamicInputs);
  const sentInputs = unique(
    callSites.flatMap(({ inputs }) =>
      inputs
        .filter(({ isProvided }) => isProvided)
        .map(({ name, value }) => `${name}: ${formatValue(value)}`)
    )
  );
  const usedOutputs = unique(
    callSites.flatMap(({ outputs }) =>
      outputs.map(({ field }) =>
        field
          ? field
          : i18n.translate('workflows.dependents.card.allOutputs', {
              defaultMessage: 'all outputs',
            })
      )
    )
  );
  const isBackgroundOnly =
    callSites.length > 0 && callSites.every(({ stepType }) => stepType === 'workflow.executeAsync');

  return [
    {
      title: i18n.translate('workflows.dependents.card.sendsTitle', {
        defaultMessage: 'Inputs it sends',
      }),
      items: sentInputs,
      emptyText: isAllDynamic
        ? i18n.translate('workflows.dependents.card.sendsComputed', {
            defaultMessage: 'Computed while running',
          })
        : i18n.translate('workflows.dependents.card.sendsNone', { defaultMessage: 'None' }),
    },
    {
      title: i18n.translate('workflows.dependents.card.usesTitle', {
        defaultMessage: 'Outputs it uses',
      }),
      items: usedOutputs,
      emptyText: isBackgroundOnly
        ? i18n.translate('workflows.dependents.card.usesBackground', {
            defaultMessage:
              'None. It starts {childName} in the background and doesn’t wait for it.',
            values: { childName },
          })
        : i18n.translate('workflows.dependents.card.usesNone', { defaultMessage: 'None' }),
    },
  ];
};

const getCallerVerdict = (
  status: ImpactStatus,
  childName: string,
  hasUnsavedChanges: boolean,
  enabled: boolean
): string => {
  if (!enabled && (status === 'breaking' || status === 'warning')) {
    return i18n.translate('workflows.dependents.verdict.caller.turnedOff', {
      defaultMessage:
        'Turned off, so saving doesn’t break any runs. It {status, select, breaking {will} other {might}} break if it’s turned back on',
      values: { status },
    });
  }
  switch (status) {
    case 'breaking':
      return i18n.translate('workflows.dependents.verdict.caller.breaking', {
        defaultMessage: 'Will break when you save',
      });
    case 'warning':
      return i18n.translate('workflows.dependents.verdict.caller.warning', {
        defaultMessage: 'Might break when you save',
      });
    case 'alreadyBroken':
      return i18n.translate('workflows.dependents.verdict.caller.alreadyBroken', {
        defaultMessage: 'Already broken, and not because of your changes',
      });
    case 'unknown':
      return i18n.translate('workflows.dependents.verdict.caller.unknown', {
        defaultMessage: 'Can’t check: it computes its inputs while running',
      });
    case 'safe':
      return hasUnsavedChanges
        ? i18n.translate('workflows.dependents.verdict.caller.safeWithChanges', {
            defaultMessage: 'Keeps working after you save',
          })
        : i18n.translate('workflows.dependents.verdict.caller.safe', {
            defaultMessage: 'Works with {childName}',
            values: { childName },
          });
  }
};

const MAX_LISTED_NAMES = 5;

const formatNames = (names: readonly string[]): string => {
  const listed = names.slice(0, MAX_LISTED_NAMES).join(', ');
  return names.length > MAX_LISTED_NAMES
    ? i18n.translate('workflows.dependents.card.namesAndMore', {
        defaultMessage: '{listed} and {count} more',
        values: { listed, count: names.length - MAX_LISTED_NAMES },
      })
    : listed;
};

const getUpstreamNotes = (upstream: readonly UpstreamImpact[], workflowName: string): string[] => {
  const failing = upstream.filter(({ effect }) => effect === 'fails');
  const losingData = upstream.filter(({ effect }) => effect === 'missingOutput');
  const notes: string[] = [];
  if (failing.length > 0) {
    notes.push(
      i18n.translate('workflows.dependents.card.upstreamFails', {
        defaultMessage:
          '{names} will fail too, because {count, plural, one {it runs} other {they run}} {workflowName}, directly or through other workflows.',
        values: {
          names: formatNames(failing.map(({ workflowName: name }) => name)),
          count: failing.length,
          workflowName,
        },
      })
    );
  }
  losingData.slice(0, MAX_LISTED_NAMES).forEach(({ workflowName: name, viaName, field }) => {
    notes.push(
      field
        ? i18n.translate('workflows.dependents.card.upstreamMissingOutput', {
            defaultMessage:
              '{name} keeps running, but gets nothing for the output "{field}" of {viaName}, which comes from here.',
            values: { name, field, viaName },
          })
        : i18n.translate('workflows.dependents.card.upstreamStepFails', {
            defaultMessage:
              '{name} keeps running, but its step that runs {viaName} fails and returns nothing.',
            values: { name, viaName },
          })
    );
  });
  if (losingData.length > MAX_LISTED_NAMES) {
    notes.push(
      i18n.translate('workflows.dependents.card.upstreamMoreMissingOutput', {
        defaultMessage:
          '{count, plural, one {# more workflow gets} other {# more workflows get}} empty values further up.',
        values: { count: losingData.length - MAX_LISTED_NAMES },
      })
    );
  }
  return notes;
};

/** Card content for a workflow that runs the open workflow (`childName`). */
export const getCallerCardContent = (
  dependent: DependentImpact,
  childName: string,
  hasUnsavedChanges: boolean
): CardContent => {
  const { workflowName, enabled, status, callSites, issues, upstream } = dependent;
  const hasManySteps = callSites.length > 1;
  return {
    name: workflowName,
    isTurnedOff: !enabled,
    status,
    statusLabel: getStatusLabel(status),
    verdict: getCallerVerdict(status, childName, hasUnsavedChanges, enabled),
    problems: toProblems(
      issues.filter(({ isNew }) => isNew),
      childName,
      hasManySteps
    ),
    earlierProblems: toProblems(
      issues.filter(({ isNew }) => !isNew),
      childName,
      hasManySteps
    ),
    notes: getUpstreamNotes(upstream, workflowName),
    details: getUsageDetails(callSites, childName),
  };
};

const getCalledVerdict = (called: CalledWorkflowImpact, childName: string): string => {
  switch (called.status) {
    case 'breaking':
    case 'alreadyBroken':
      return i18n.translate('workflows.dependents.verdict.called.breaking', {
        defaultMessage: 'Will fail when it runs',
      });
    case 'warning':
      return i18n.translate('workflows.dependents.verdict.called.warning', {
        defaultMessage: 'Might fail when it runs',
      });
    case 'unknown':
      return i18n.translate('workflows.dependents.verdict.called.unknown', {
        defaultMessage: 'Can’t check: the inputs are computed while running',
      });
    case 'safe':
      return i18n.translate('workflows.dependents.verdict.called.safe', {
        defaultMessage: 'Works: it sends what {childName} needs and only uses outputs it returns',
        values: { childName },
      });
  }
};

/** Card content for a workflow that the open workflow runs. */
export const getCalledCardContent = (called: CalledWorkflowImpact): CardContent => {
  const { workflowId, workflowName, status, callSites, issues, contract } = called;
  const childName = workflowName ?? workflowId;
  const contractDetails: CardDetail[] = contract
    ? [
        {
          title: i18n.translate('workflows.dependents.card.acceptsTitle', {
            defaultMessage: '{childName} accepts',
            values: { childName },
          }),
          items: Object.values(contract.inputs).map(({ name, type, required, hasDefault }) =>
            required && !hasDefault
              ? i18n.translate('workflows.dependents.card.acceptsRequired', {
                  defaultMessage: '{name}: {type}, required',
                  values: { name, type: type ?? 'any' },
                })
              : i18n.translate('workflows.dependents.card.acceptsOptional', {
                  defaultMessage: '{name}: {type}, optional',
                  values: { name, type: type ?? 'any' },
                })
          ),
          emptyText: i18n.translate('workflows.dependents.card.acceptsNone', {
            defaultMessage: 'No inputs',
          }),
        },
        {
          title: i18n.translate('workflows.dependents.card.returnsTitle', {
            defaultMessage: '{childName} returns',
            values: { childName },
          }),
          items: Object.keys(contract.outputs).filter(
            (name) => !contract.unreturnedOutputs.includes(name)
          ),
          emptyText: i18n.translate('workflows.dependents.card.returnsNone', {
            defaultMessage: 'No outputs',
          }),
        },
      ]
    : [];
  return {
    name: childName,
    isTurnedOff: contract ? !contract.enabled : false,
    status,
    statusLabel: getCalledStatusLabel(status),
    verdict: getCalledVerdict(called, childName),
    problems: toProblems(issues, childName, callSites.length > 1),
    earlierProblems: [],
    notes: [],
    details: contract ? [...getUsageDetails(callSites, childName), ...contractDetails] : [],
  };
};
