/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopoverTitle,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { SelectableList } from '../selectable_list';
import type {
  SelectableListItem,
  SelectableListProps,
  SelectableListSearchConfig,
} from '../selectable_list';

import { Footer } from '../footer';
import { LinksList } from '../links_list';
import type { ActionConfig, LinksListItem } from '../types';

const toFooterLink = (action: ActionConfig, iconType: ActionConfig['iconType']): LinksListItem => ({
  id: action.id,
  label: action.label,
  href: action.href,
  onClick: action.onClick,
  external: action.external,
  disabled: action.disabled,
  iconType: action.iconType ?? iconType,
  'data-test-subj': action['data-test-subj'],
});

const BACK_BUTTON_ARIA_LABEL = i18n.translate(
  'contextSwitcherComponents.spacesListView.backButtonAriaLabel',
  {
    defaultMessage: 'Back',
  }
);
export interface SpacesListViewProps {
  readonly id: string;
  readonly title?: string;
  readonly headerAction?: ActionConfig;
  readonly items: ReadonlyArray<SelectableListItem>;
  readonly search?: SelectableListSearchConfig;
  readonly isLoading?: boolean;
  readonly loadingMessage?: string;
  readonly noMatchesMessage?: ReactElement;
  readonly footerAction?: ActionConfig;
  /** Original menu: "Manage" sits in the title and "Create space" stays in the footer. */
  readonly headerActionInTitle?: boolean;
  readonly onBack?: () => void;
  readonly onSelect: SelectableListProps['onSelect'];
}

/**
 * The list view for the spaces that contains the title, the selectable list and the footer action.
 */

export const SpacesListView = ({
  id,
  title,
  onBack,
  headerAction,
  items,
  onSelect,
  search,
  isLoading,
  loadingMessage,
  noMatchesMessage,
  footerAction,
  headerActionInTitle = false,
}: SpacesListViewProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <SelectableList
        id={id}
        items={items}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        noMatchesMessage={noMatchesMessage}
        search={search}
        onSelect={onSelect}
      >
        {({ list, search: searchNode }) => (
          <>
            {(title || onBack || (headerActionInTitle && headerAction)) && (
              <EuiPopoverTitle
                css={css`
                  border-bottom: 0;
                  padding-bottom: 0;
                `}
              >
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent={headerActionInTitle ? 'spaceBetween' : 'flexStart'}
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      {onBack && (
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={BACK_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
                            <EuiButtonIcon
                              iconType="chevronSingleLeft"
                              aria-label={BACK_BUTTON_ARIA_LABEL}
                              color="text"
                              display="empty"
                              size="s"
                              onClick={onBack}
                              data-test-subj="contextSwitcherSpacesBackButton"
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      )}
                      {title && (
                        <EuiFlexItem
                          grow={false}
                          css={
                            !onBack
                              ? css`
                                  padding-left: ${euiTheme.size.xs};
                                `
                              : undefined
                          }
                        >
                          {title}
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {headerActionInTitle && headerAction && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        onClick={headerAction.onClick}
                        data-test-subj={headerAction['data-test-subj']}
                        isDisabled={headerAction.disabled}
                        target={headerAction.external ? '_blank' : undefined}
                      >
                        {headerAction.label}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                {headerActionInTitle && searchNode && (
                  <>
                    <EuiSpacer size="s" />
                    {searchNode}
                  </>
                )}
              </EuiPopoverTitle>
            )}
            {!headerActionInTitle && searchNode && (
              <div
                css={css`
                  padding: ${euiTheme.size.xs};
                `}
              >
                {searchNode}
              </div>
            )}
            {list}
          </>
        )}
      </SelectableList>

      {headerActionInTitle && footerAction && (
        <>
          <EuiHorizontalRule margin="xs" />
          <Footer action={footerAction} />
        </>
      )}

      {!headerActionInTitle && (headerAction || footerAction) && (
        <>
          <EuiHorizontalRule margin="xs" />
          <LinksList
            items={[
              headerAction ? toFooterLink(headerAction, 'gear') : undefined,
              footerAction ? toFooterLink(footerAction, 'plus') : undefined,
            ].filter((item): item is LinksListItem => Boolean(item))}
          />
        </>
      )}
    </>
  );
};
