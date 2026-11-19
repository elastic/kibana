/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext, type MouseEvent } from 'react';
import { i18n } from '@kbn/i18n';
import type { ContentListClientProviderProps } from '@kbn/content-list-provider-client';
import type {
  HousekeepingFinding,
  HousekeepingFindingGroup,
  HousekeepingFindingKind,
  HousekeepingFindingSeverity,
  HousekeepingResource,
  HousekeepingResourceTypeInfo,
} from '../common';

export const HOUSEKEEPING_FLYOUT_TITLE_ID = 'housekeepingFlyoutTitle';

export const FINDING_KIND_METADATA: Record<
  HousekeepingFindingKind,
  {
    label: string;
    summaryLabel: string;
    /** What the kind means, shown with its count. */
    description: string;
    /** The text color of the theme for the count, when there are findings of the kind. */
    countColor: 'textDanger' | 'textWarning' | 'textRisk' | undefined;
    badgeColor: 'danger' | 'warning' | 'risk' | 'default';
  }
> = {
  broken_reference: {
    label: i18n.translate('housekeeping.kind.brokenReference', {
      defaultMessage: 'Broken reference',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.brokenReferenceSummary', {
      defaultMessage: 'Broken references',
    }),
    description: i18n.translate('housekeeping.kind.brokenReferenceDescription', {
      defaultMessage: 'Point to something that does not exist, so they fail today.',
    }),
    countColor: 'textDanger',
    badgeColor: 'danger',
  },
  deprecation: {
    label: i18n.translate('housekeeping.kind.deprecation', {
      defaultMessage: 'Deprecation',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.deprecationSummary', {
      defaultMessage: 'Deprecations',
    }),
    description: i18n.translate('housekeeping.kind.deprecationDescription', {
      defaultMessage: 'Stop working in the next major version. Resolve them before you upgrade.',
    }),
    countColor: 'textWarning',
    badgeColor: 'warning',
  },
  unused: {
    label: i18n.translate('housekeeping.kind.unused', {
      defaultMessage: 'Unused',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.unusedSummary', {
      defaultMessage: 'Unused resources',
    }),
    description: i18n.translate('housekeeping.kind.unusedDescription', {
      defaultMessage: 'Nothing in the cluster uses them. Remove them to keep it tidy.',
    }),
    countColor: undefined,
    badgeColor: 'default',
  },
  risk: {
    label: i18n.translate('housekeeping.kind.risk', {
      defaultMessage: 'Risk',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.riskSummary', {
      defaultMessage: 'Risks',
    }),
    description: i18n.translate('housekeeping.kind.riskDescription', {
      defaultMessage: 'Work today, but may cause trouble later.',
    }),
    countColor: 'textRisk',
    badgeColor: 'risk',
  },
};

export const FINDING_SEVERITY_METADATA: Record<
  HousekeepingFindingSeverity,
  { label: string; badgeColor: 'danger' | 'default' }
> = {
  critical: {
    label: i18n.translate('housekeeping.severity.critical', { defaultMessage: 'Critical' }),
    badgeColor: 'danger',
  },
  warning: {
    label: i18n.translate('housekeeping.severity.warning', { defaultMessage: 'Warning' }),
    badgeColor: 'default',
  },
};

/** Labels of the resource types, which providers register on the server. */
export const ResourceTypesContext = createContext<Record<string, HousekeepingResourceTypeInfo>>({});

export const useResourceTypeInfo = (type: string): HousekeepingResourceTypeInfo =>
  useContext(ResourceTypesContext)[type] ?? { label: type };

export interface ResourceLink {
  href: string;
  onClick: (event: MouseEvent) => void;
}

/** Resolves the locator of a resource into a link to the plugin that owns it. */
export const ResourceLinksContext = createContext<
  (resource: HousekeepingResource) => ResourceLink | undefined
>(() => undefined);

export interface AskAgentRequest {
  group: HousekeepingFindingGroup;
  finding: HousekeepingFinding;
  resourceTypeLabel: string;
}

/** Opens an Agent Builder conversation about a finding, when the user has Agent Builder. */
export const AskAgentContext = createContext<((request: AskAgentRequest) => void) | undefined>(
  undefined
);

/** A fix with its own UI, such as a guided flyout, that the plugin that owns the finding opens. */
export interface HousekeepingFindingActionDefinition {
  id: string;
  label: string;
  iconType: string;
  run(finding: HousekeepingFinding): void;
}

export interface FindingActionButton {
  label: string;
  iconType: string;
  onClick: () => void;
}

/** Resolves the registered actions of a finding into buttons. */
export const FindingActionsContext = createContext<
  (finding: HousekeepingFinding) => FindingActionButton[]
>(() => []);

export interface ConsoleActions {
  /** Without the embedded Console on the page, Console opens in a new tab. */
  opensInNewTab(): boolean;
  open(request: string): void;
}

export const OpenInConsoleContext = createContext<ConsoleActions | undefined>(undefined);

/** The parts of core that the content list of the findings reads. */
export const ContentListCoreContext = createContext<
  ContentListClientProviderProps['core'] | undefined
>(undefined);
