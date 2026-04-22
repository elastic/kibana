/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';
import { useObservable } from '@kbn/use-observable';
import { useCurrentAppId, useHotkeys } from './chrome_hooks';
import { formatChord } from './format_chord';

type Section = 'global' | 'app' | 'context';

interface GroupedRegistrations {
  global: HotkeyDefinition[];
  app: HotkeyDefinition[];
  context: HotkeyDefinition[];
}

const EMPTY_REGISTRATIONS: ReadonlyArray<HotkeyDefinition> = [];

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

const matches = (def: HotkeyDefinition, query: string): boolean => {
  if (!query) return true;
  const haystack = [def.label, def.description, def.group, def.keys].filter(Boolean).join(' ');
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

const HotkeyRow = ({ def }: { def: HotkeyDefinition }) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" responsive={false}>
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
      <EuiBadge color="hollow" data-test-subj={`hotkeysCheatSheet-chord-${def.id}`}>
        {formatChord(def.keys)}
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const Section = ({ title, entries }: { title: string; entries: HotkeyDefinition[] }) => {
  if (entries.length === 0) return null;
  return (
    <>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {entries.map((def) => (
        <React.Fragment key={def.id}>
          <HotkeyRow def={def} />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      <EuiSpacer size="m" />
    </>
  );
};

export interface HotkeysCheatSheetModalProps {
  onClose: () => void;
}

/**
 * Modal that lists every currently-registered Kibana hotkey, grouped by scope
 * and filterable by label/description/chord.
 */
export const HotkeysCheatSheetModal = ({ onClose }: HotkeysCheatSheetModalProps) => {
  const hotkeys = useHotkeys();
  const currentAppId = useCurrentAppId();
  const registrations$ = useMemo(() => hotkeys.getRegistrations$(), [hotkeys]);
  const registrations = useObservable(registrations$, EMPTY_REGISTRATIONS);
  const [query, setQuery] = useState('');
  const modalTitleId = useGeneratedHtmlId();

  const grouped = useMemo(
    () => group(registrations, currentAppId, query),
    [registrations, currentAppId, query]
  );
  const isEmpty =
    grouped.global.length === 0 && grouped.app.length === 0 && grouped.context.length === 0;

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={560}
      aria-labelledby={modalTitleId}
      data-test-subj="hotkeysCheatSheetModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('core.ui.chrome.hotkeysCheatSheet.title', {
            defaultMessage: 'Keyboard shortcuts',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
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
            <Section title={SECTION_TITLES.global} entries={grouped.global} />
            <Section title={SECTION_TITLES.app} entries={grouped.app} />
            <Section title={SECTION_TITLES.context} entries={grouped.context} />
          </>
        )}
      </EuiModalBody>
    </EuiModal>
  );
};
