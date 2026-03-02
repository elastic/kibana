/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiPopover,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { CSSObject } from '@emotion/serialize';
import { isTabDeleted } from '../utils/is_tab_deleted';

interface SearchEmbeddableInlineEditHoverActionsProps {
  draftSelectedTabId$: BehaviorSubject<string | undefined>;
  onEditInDiscover: () => Promise<void>;
  onSelectTab: (tabId: string) => Promise<void>;
  tabs: DiscoverSessionTab[];
}

export const SearchEmbeddableInlineEditHoverActions = ({
  draftSelectedTabId$,
  onEditInDiscover,
  onSelectTab,
  tabs,
}: SearchEmbeddableInlineEditHoverActionsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [selectedTabId] = useBatchedPublishingSubjects(draftSelectedTabId$);

  const { euiTheme } = useEuiTheme();

  const isSelectedTabDeleted = useMemo(
    () => isTabDeleted(selectedTabId, tabs),
    [selectedTabId, tabs]
  );

  const selectedTabLabel = useMemo(() => {
    const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

    if (selectedTab) return selectedTab.label;

    if (isSelectedTabDeleted) {
      return i18n.translate('discover.embeddable.inlineEdit.deletedTabLabel', {
        defaultMessage: '(Deleted tab)',
      });
    }

    return tabs[0]?.label ?? '';
  }, [isSelectedTabDeleted, selectedTabId, tabs]);

  const items = useMemo(
    () =>
      tabs.map((tab) => (
        <EuiContextMenuItem
          icon={tab.id === selectedTabId ? 'check' : 'empty'}
          aria-current={tab.id === selectedTabId ? 'true' : undefined}
          key={tab.id}
          onClick={() => {
            void onSelectTab(tab.id);
            setIsPopoverOpen(false);
          }}
        >
          <EuiTextTruncate text={tab.label} truncation="middle" width={euiTheme.base * 20} />
        </EuiContextMenuItem>
      )),
    [euiTheme.base, onSelectTab, selectedTabId, tabs]
  );

  const buttonStyles = useMemo<CSSObject>(
    () => ({
      height: euiTheme.size.l,
      paddingInline: euiTheme.size.xs,
    }),
    [euiTheme.size.l, euiTheme.size.xs]
  );

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      wrap={false}
      gutterSize="xs"
      css={{ paddingInline: `${euiTheme.size.xs} 0 !important` }}
    >
      <EuiButtonEmpty
        flush="both"
        size="s"
        data-test-subj="discoverEmbeddableInlineEditEditInDiscoverLink"
        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          void onEditInDiscover();
        }}
        css={buttonStyles}
      >
        {i18n.translate('discover.embeddable.inlineEdit.editInDiscoverLinkLabel', {
          defaultMessage: 'Edit in Discover',
        })}
      </EuiButtonEmpty>
      <EuiPopover
        anchorPosition="downRight"
        button={
          <EuiButton
            aria-label={i18n.translate('discover.embeddable.inlineEdit.selectTabButtonAriaLabel', {
              defaultMessage: 'Select tab',
            })}
            color={isSelectedTabDeleted ? 'danger' : 'primary'}
            data-test-subj="discoverEmbeddableInlineEditSelectTabAction"
            disabled={tabs.length === 0}
            iconSide="right"
            iconType="arrowDown"
            onClick={() => setIsPopoverOpen((open) => !open)}
            size="s"
            css={[buttonStyles, { marginInlineEnd: euiTheme.size.xs }]}
          >
            <EuiTextTruncate
              text={selectedTabLabel}
              truncation="middle"
              width={euiTheme.base * 10}
            />
          </EuiButton>
        }
        closePopover={() => setIsPopoverOpen(false)}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        offset={euiTheme.base / 2}
      >
        <EuiContextMenuPanel
          data-test-subj="discoverEmbeddableInlineEditSelectTabPopover"
          items={items}
          size="s"
          title={i18n.translate('discover.embeddable.inlineEdit.selectTabMenuTitle', {
            defaultMessage: 'Selected tab',
          })}
          css={{ '.euiContextMenuPanel__title': { padding: euiTheme.size.s } }}
        />
      </EuiPopover>
    </EuiFlexGroup>
  );
};
