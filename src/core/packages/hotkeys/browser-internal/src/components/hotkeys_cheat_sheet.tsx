/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPageHeader,
  EuiPageBody,
  EuiPanel,
  EuiPageHeaderSection,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import type {
  HotkeyDefinition,
  HotkeysSidebarActions,
  HotkeysSidebarState,
} from '@kbn/core-hotkeys-browser';

import { useObservable } from '@kbn/use-observable';
import type { Observable } from 'rxjs';
import { formatChord } from '../utils';

type Section = 'global' | 'app' | 'context';

interface GroupedRegistrations {
  global: HotkeyDefinition[];
  app: HotkeyDefinition[];
  context: HotkeyDefinition[];
}

interface FeatureBucket {
  readonly featureId: string;
  readonly defs: readonly HotkeyDefinition[];
}

const EMPTY_REGISTRATIONS: ReadonlyArray<HotkeyDefinition> = [];

const GROUP_UNIT_SEPARATOR = '\u241E';

const SECTION_TITLES: Record<Section, string> = {
  global: i18n.translate('core.ui.chrome.hotkeysCheatSheet.sectionGlobal', {
    defaultMessage: 'Global',
  }),
  app: i18n.translate('core.ui.chrome.hotkeysCheatSheet.sectionApp', {
    defaultMessage: 'This application',
  }),
  context: i18n.translate('core.ui.chrome.hotkeysCheatSheet.sectionContext', {
    defaultMessage: 'On this page',
  }),
};

/** Cosmetic display only — featureIds are registrant-supplied namespaces. */
const formatFeatureTitle = (featureId: string): string => featureId.replace(/:/g, ' › ');

/** Subsection heading for a bucket keyed by {@link HotkeyDefinition.featureId}. */
const getBucketTitle = (featureId: string, defs: readonly HotkeyDefinition[]): string => {
  if (defs.length === 0) {
    return formatFeatureTitle(featureId);
  }
  const firstGroup = defs[0].group;
  if (firstGroup !== undefined && firstGroup !== '' && defs.every((d) => d.group === firstGroup)) {
    return firstGroup;
  }
  return formatFeatureTitle(featureId);
};

const partitionIntoFeatureBuckets = (
  entries: readonly HotkeyDefinition[]
): { readonly buckets: readonly FeatureBucket[]; readonly noFeature: HotkeyDefinition[] } => {
  const byFeature = new Map<string, HotkeyDefinition[]>();
  const noFeature: HotkeyDefinition[] = [];
  for (const def of entries) {
    if (def.featureId) {
      const list = byFeature.get(def.featureId);
      if (list) {
        list.push(def);
      } else {
        byFeature.set(def.featureId, [def]);
      }
    } else {
      noFeature.push(def);
    }
  }
  const buckets: FeatureBucket[] = [...byFeature.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([featureId, defs]) => ({ featureId, defs }));
  return { buckets, noFeature };
};

const matches = (def: HotkeyDefinition, query: string): boolean => {
  if (!query) return true;
  const haystack = [def.label, def.description, def.group, def.featureId, def.keys]
    .filter(Boolean)
    .join(' ');
  return haystack.toLowerCase().includes(query.toLowerCase());
};

const group = (
  registrations: ReadonlyArray<HotkeyDefinition>,
  currentAppId: string | undefined,
  query: string
): GroupedRegistrations => {
  const grouped: GroupedRegistrations = { global: [], app: [], context: [] };
  for (const def of registrations) {
    if (!matches(def, query)) continue;
    const scope: Section = def.scope ?? 'context';
    if (scope === 'global') {
      grouped.global.push(def);
    } else if (scope === 'app' && def.appId && def.appId === currentAppId) {
      grouped.app.push(def);
    } else if (scope === 'context') {
      grouped.context.push(def);
    }
  }
  return grouped;
};

const HotkeyRow = ({ def }: { def: HotkeyDefinition }) => {
  const separatorToken = '+' as const;
  // force a separator token so we can consistently split the chord into keys, across platforms
  const formattedChord = formatChord(def.keys, { separatorToken });

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="m"
      responsive={false}
      data-test-subj={`hotkeysCheatSheet-chord-${def.id}`}
    >
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{def.label}</strong>
        </EuiText>
        {def.description ? (
          <EuiText size="xs" color="subdued">
            {def.description}
          </EuiText>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem
            grow={false}
            css={css({ display: 'none', ':hover': { display: 'initial' } })}
          >
            <EuiButtonIcon aria-label="Edit" color="text" iconType="pencil" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={formattedChord}>
              <EuiFlexGroup gutterSize="xs">
                {formattedChord.split(separatorToken).map((key) => (
                  <EuiFlexItem key={key} grow={false}>
                    <EuiNotificationBadge color="subdued">{key}</EuiNotificationBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const HotkeyRows = ({ defs }: { defs: readonly HotkeyDefinition[] }) => (
  <>
    {defs.map((def) => (
      <React.Fragment key={def.id}>
        <HotkeyRow def={def} />
        <EuiSpacer size="s" />
      </React.Fragment>
    ))}
  </>
);

const ScopeSection = ({
  title,
  entries,
}: {
  title: string;
  entries: readonly HotkeyDefinition[];
}) => {
  if (entries.length === 0) {
    return null;
  }
  const { buckets, noFeature } = partitionIntoFeatureBuckets(entries);
  const hasFeatureBuckets = buckets.length > 0;
  const hasNoFeatureTail = noFeature.length > 0;

  return (
    <>
      <EuiTitle size="xs">
        <p>{title}</p>
      </EuiTitle>
      <EuiHorizontalRule margin="xs" />
      {hasFeatureBuckets
        ? buckets.map(({ featureId, defs }) => (
            <React.Fragment key={featureId}>
              <EuiTitle size="xxs">
                <p>{getBucketTitle(featureId, defs)}</p>
              </EuiTitle>
              <EuiSpacer size="s" />
              <HotkeyRows defs={defs} />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))
        : null}
      {hasFeatureBuckets && hasNoFeatureTail ? (
        <>
          <EuiHorizontalRule margin="m" />
          <HotkeyRows defs={noFeature} />
        </>
      ) : (
        <HotkeyRows defs={noFeature} />
      )}
      <EuiSpacer size="m" />
    </>
  );
};

interface HotkeysCheatSheetProps
  extends SidebarComponentProps<HotkeysSidebarState, HotkeysSidebarActions> {
  getRegistrations$: () => Observable<ReadonlyArray<HotkeyDefinition>>;
  getCurrentAppId$: () => Observable<string | undefined>;
}

/**
 * Sidebar panel that lists Kibana hotkeys: grouped by scope and filterable.
 * When the sidebar store sets `pendingFeatureFocus`, the search field is seeded and the intent cleared.
 */
export const HotkeysCheatSheet = ({
  onClose,
  state,
  actions,
  getRegistrations$,
  getCurrentAppId$,
}: HotkeysCheatSheetProps) => {
  const registrationsObsRef = useRef<Observable<ReadonlyArray<HotkeyDefinition>>>(
    getRegistrations$()
  );
  const currentAppIdObsRef = useRef<Observable<string | undefined>>(getCurrentAppId$());

  const currentAppId = useObservable(currentAppIdObsRef.current);
  const registrations = useObservable(registrationsObsRef.current, EMPTY_REGISTRATIONS);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const pending = state.pendingFeatureFocus;
    if (pending == null || pending === '') {
      return;
    }
    setQuery(pending);
    actions.clearPendingFeatureFocus();
  }, [state.pendingFeatureFocus, actions]);

  const grouped = useMemo(
    () => group(registrations, currentAppId, query),
    [registrations, currentAppId, query]
  );
  const isEmpty =
    grouped.global.length === 0 && grouped.app.length === 0 && grouped.context.length === 0;

  return (
    <EuiPanel hasShadow={false}>
      <EuiPageHeader responsive={false} bottomBorder>
        <EuiPageHeaderSection>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('core.ui.chrome.hotkeysCheatSheet.title', {
                defaultMessage: 'Keyboard shortcuts',
              })}
            </h3>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>
          <EuiButtonIcon
            iconType="cross"
            onClick={onClose}
            aria-label={i18n.translate('core.ui.chrome.hotkeysCheatSheet.closeButtonAriaLabel', {
              defaultMessage: 'Close',
            })}
          />
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiSpacer size="m" />
      <EuiPageBody>
        <EuiFieldSearch
          fullWidth
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={i18n.translate('core.ui.chrome.hotkeysCheatSheet.searchPlaceholder', {
            defaultMessage: 'Filter shortcuts',
          })}
          data-test-subj="hotkeysCheatSheetSearch"
        />
        <EuiSpacer size="m" />
        {isEmpty ? (
          <EuiEmptyPrompt
            iconType="keyboard"
            titleSize="xs"
            title={
              <h3>
                {i18n.translate('core.ui.chrome.hotkeysCheatSheet.emptyTitle', {
                  defaultMessage: 'No shortcuts match',
                })}
              </h3>
            }
          />
        ) : (
          <>
            <ScopeSection title={SECTION_TITLES.global} entries={grouped.global} />
            {grouped.app.length > 0 || grouped.context.length > 0 ? (
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                responsive={false}
                data-test-subj="hotkeysCheatSheetVolatileScopes"
              >
                <ScopeSection title={SECTION_TITLES.app} entries={grouped.app} />
                <ScopeSection title={SECTION_TITLES.context} entries={grouped.context} />
              </EuiFlexGroup>
            ) : null}
          </>
        )}
      </EuiPageBody>
    </EuiPanel>
  );
};
