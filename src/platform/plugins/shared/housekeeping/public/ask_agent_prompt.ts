/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HousekeepingFinding, HousekeepingFindingGroup } from '../common';
import { isResourceUser } from '../common';

const bullet = (text: string) => `- ${text}`;

/** What Housekeeping already checked in the cluster, so the agent doesn't check it again. */
const getUsageFact = (finding: HousekeepingFinding) => {
  const usedBy = finding.evidence?.usedBy;
  if (!Array.isArray(usedBy) || !usedBy.every(isResourceUser)) {
    return [];
  }
  return [
    usedBy.length
      ? i18n.translate('housekeeping.askAgent.verifiedUsedBy', {
          defaultMessage: '{resource} is used by: {users}.',
          values: {
            resource: finding.resource.id,
            users: usedBy.map(({ id, via }) => `${id} (${via})`).join(', '),
          },
        })
      : i18n.translate('housekeeping.askAgent.verifiedNotUsed', {
          defaultMessage:
            'No index, template or other resource in the cluster references {resource}. Clients outside the cluster may still use it.',
          values: { resource: finding.resource.id },
        }),
  ];
};

const getVerifiedFacts = (group: HousekeepingFindingGroup, finding: HousekeepingFinding) => {
  if (group.kind === 'broken_reference') {
    return [
      ...finding.related.map(({ id }) =>
        i18n.translate('housekeeping.askAgent.verifiedMissing', {
          defaultMessage: '{target} does not exist, and {resource} references it.',
          values: { target: id, resource: finding.resource.id },
        })
      ),
      ...getUsageFact(finding),
    ];
  }
  if (group.kind === 'unused') {
    return [
      i18n.translate('housekeeping.askAgent.verifiedUnused', {
        defaultMessage: 'Nothing else in the cluster references {resource}.',
        values: { resource: finding.resource.id },
      }),
    ];
  }
  return [];
};

const getDefinitionFact = ({ resource, evidence }: HousekeepingFinding) => {
  const existingCount = evidence?.existingCount;
  return typeof existingCount === 'number' && existingCount > 0
    ? i18n.translate('housekeeping.askAgent.definitionWithAlternativesAttached', {
        defaultMessage:
          'The current definition of {resource} is attached, with what Housekeeping found about it, including the existing resources it could point to instead.',
        values: { resource: resource.id },
      })
    : i18n.translate('housekeeping.askAgent.definitionAttached', {
        defaultMessage:
          'The current definition of {resource} is attached, with what Housekeeping found about it.',
        values: { resource: resource.id },
      });
};

/** Left out when there is nothing to list, as for a risk whose definition could not be read. */
const getVerifiedSection = (
  group: HousekeepingFindingGroup,
  finding: HousekeepingFinding,
  hasDefinition: boolean
) => {
  const facts = [
    ...getVerifiedFacts(group, finding),
    ...(hasDefinition ? [getDefinitionFact(finding)] : []),
  ];
  return facts.length
    ? [
        '',
        i18n.translate('housekeeping.askAgent.verifiedIntro', {
          defaultMessage:
            'Housekeeping already verified these facts against the cluster, so you do not need to check them again:',
        }),
        ...facts.map(bullet),
      ]
    : [];
};

/** The first message of an Agent Builder conversation about a finding. */
export const buildAskAgentPrompt = ({
  group,
  finding,
  resourceTypeLabel,
  hasDefinition = false,
}: {
  group: HousekeepingFindingGroup;
  finding: HousekeepingFinding;
  resourceTypeLabel: string;
  /** Whether the definition of the resource goes as an attachment. */
  hasDefinition?: boolean;
}) =>
  [
    i18n.translate('housekeeping.askAgent.request', {
      defaultMessage:
        'Help me resolve this Housekeeping finding in my Elasticsearch cluster. Explain what is wrong and what happens if I leave it, and propose the requests to fix it. Before running anything that changes the cluster, show me the request and wait for my confirmation, then run it here.',
    }),
    '',
    bullet(
      i18n.translate('housekeeping.askAgent.finding', {
        defaultMessage: 'Finding: {title}',
        values: { title: group.title },
      })
    ),
    ...(finding.severity
      ? [
          bullet(
            i18n.translate('housekeeping.askAgent.severity', {
              defaultMessage: 'Severity: {severity}',
              values: { severity: finding.severity },
            })
          ),
        ]
      : []),
    ...(group.description
      ? [
          bullet(
            i18n.translate('housekeeping.askAgent.description', {
              defaultMessage: 'Why it matters: {description}',
              values: { description: group.description },
            })
          ),
        ]
      : []),
    bullet(
      i18n.translate('housekeeping.askAgent.resource', {
        defaultMessage: 'Resource: {type} {id}',
        values: { type: resourceTypeLabel, id: finding.resource.id },
      })
    ),
    ...(finding.related.length
      ? [
          bullet(
            i18n.translate('housekeeping.askAgent.related', {
              defaultMessage: 'Points to: {related}',
              values: { related: finding.related.map(({ id }) => id).join(', ') },
            })
          ),
        ]
      : []),
    ...(finding.details ?? []).map(bullet),
    ...(finding.message ? [bullet(finding.message)] : []),
    ...getVerifiedSection(group, finding, hasDefinition),
    ...(finding.fix
      ? [
          '',
          i18n.translate('housekeeping.askAgent.suggestedFix', {
            defaultMessage: 'Housekeeping suggests this request, which you can start from:',
          }),
          '```',
          finding.fix.request,
          '```',
        ]
      : []),
  ].join('\n');
