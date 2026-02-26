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
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLink,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
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
          icon={tab.id === selectedTabId ? 'check' : undefined}
          key={tab.id}
          onClick={() => {
            void onSelectTab(tab.id);
            setIsPopoverOpen(false);
          }}
        >
          {tab.label}
        </EuiContextMenuItem>
      )),
    [onSelectTab, selectedTabId, tabs]
  );

  return (
    <div css={{ display: 'flex' }}>
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: euiTheme.size.xs,
          paddingInline: euiTheme.size.xs,
        }}
      >
        <EuiLink
          css={{
            paddingInline: euiTheme.size.xs,
            whiteSpace: 'nowrap',
          }}
          data-test-subj="discoverEmbeddableInlineEditEditInDiscoverLink"
          onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            void onEditInDiscover();
          }}
        >
          {i18n.translate('discover.embeddable.inlineEdit.editInDiscoverLinkLabel', {
            defaultMessage: 'Edit in Discover',
          })}
        </EuiLink>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <EuiButtonEmpty
              aria-label={i18n.translate(
                'discover.embeddable.inlineEdit.selectTabButtonAriaLabel',
                {
                  defaultMessage: 'Select tab',
                }
              )}
              color={isSelectedTabDeleted ? 'danger' : 'primary'}
              css={{
                height: euiTheme.size.l,
                maxInlineSize: 280,
              }}
              data-test-subj="discoverEmbeddableInlineEditSelectTabAction"
              disabled={tabs.length === 0}
              iconSide="right"
              iconType="arrowDown"
              onClick={() => setIsPopoverOpen((open) => !open)}
              size="s"
            >
              <span
                css={{
                  alignItems: 'center',
                  display: 'inline-flex',
                  gap: euiTheme.size.xs,
                  maxInlineSize: 230,
                  minWidth: 0,
                }}
              >
                <span
                  css={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedTabLabel}
                </span>
              </span>
            </EuiButtonEmpty>
          }
          closePopover={() => setIsPopoverOpen(false)}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel
            data-test-subj="discoverEmbeddableInlineEditSelectTabPopover"
            items={items}
          />
        </EuiPopover>
      </div>
    </div>
  );
};
