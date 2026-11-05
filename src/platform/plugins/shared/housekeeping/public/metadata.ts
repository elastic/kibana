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
  HousekeepingResource,
  HousekeepingResourceTypeInfo,
} from '../common';

export const HOUSEKEEPING_FLYOUT_TITLE_ID = 'housekeepingFlyoutTitle';

export const FINDING_KIND_METADATA: Record<
  HousekeepingFindingKind,
  {
    label: string;
    summaryLabel: string;
    /** The color of the count when there are findings of the kind. */
    color: 'danger' | 'warning' | 'subdued';
    badgeColor: 'danger' | 'warning' | 'default';
  }
> = {
  broken_reference: {
    label: i18n.translate('housekeeping.kind.brokenReference', {
      defaultMessage: 'Broken reference',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.brokenReferenceSummary', {
      defaultMessage: 'Broken references',
    }),
    color: 'danger',
    badgeColor: 'danger',
  },
  unused: {
    label: i18n.translate('housekeeping.kind.unused', {
      defaultMessage: 'Unused',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.unusedSummary', {
      defaultMessage: 'Unused resources',
    }),
    color: 'subdued',
    badgeColor: 'default',
  },
  risk: {
    label: i18n.translate('housekeeping.kind.risk', {
      defaultMessage: 'Risk',
    }),
    summaryLabel: i18n.translate('housekeeping.kind.riskSummary', {
      defaultMessage: 'Risks',
    }),
    color: 'warning',
    badgeColor: 'warning',
  },
};

/** Labels and icons of the resource types, which providers register on the server. */
export const ResourceTypesContext = createContext<Record<string, HousekeepingResourceTypeInfo>>({});

export const useResourceTypeInfo = (type: string): HousekeepingResourceTypeInfo =>
  useContext(ResourceTypesContext)[type] ?? { label: type, iconType: 'dot' };

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
