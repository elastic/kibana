/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiToken,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { UserAvatar } from '@kbn/user-profile-components';

import { isCompressed } from '../../../../control_group/utils/is_compressed';
import { MIN_POPOVER_WIDTH } from '../../../constants';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';
import { NO_ASSIGNEES_OPTION_KEY } from '../constants';
import {
  bulkGetUserProfilesWithAvatar,
  getCachedUserProfileWithAvatar,
} from '../utils/user_profile_lookup';
import { UsersSuggestions } from './control_renderer_users_suggestions';

const optionListControlStyles = {
  selectionWrapper: css({ overflow: 'hidden !important' }),
  excludeSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: euiTheme.size.m,
      fontWeight: euiTheme.font.weight.bold,
      color: euiTheme.colors.danger,
    }),
  validOption: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.regular,
    }),
  invalidOption: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textWarning,
      fontWeight: euiTheme.font.weight.medium,
    }),
  optionsListExistsFilter: ({ euiTheme }: UseEuiTheme) => css`
    font-style: italic;
    font-weight: ${euiTheme.font.weight.medium};
  `,
  invalidSelectionsToken: css({ verticalAlign: 'text-bottom' }),
  filterButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: `${euiTheme.font.weight.regular} !important` as 'normal',
      color: `${euiTheme.colors.textSubdued} !important`,
      padding: `0 ${euiTheme.size.s}`,
      '&:hover::before': {
        background: `${euiTheme.colors.backgroundBasePlain} !important`,
      },
      blockSize: '100% !important',
    }),
  filterButtonText: css({
    flexGrow: 1,
    textAlign: 'left',
  }),
  assigneeAvatars: css({
    display: 'flex',
    alignItems: 'center',
  }),
  assigneeAvatarWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      // overlap avatars slightly
      marginLeft: `-${euiTheme.size.xs}`,
      '&:first-of-type': { marginLeft: 0 },
    }),
  inputButtonOverride: css({
    width: '100%',
    height: '100%',
    maxInlineSize: '100%',
  }),
  /* additional custom overrides due to unexpected component usage;
    open issue: https://github.com/elastic/eui-private/issues/270 */
  filterGroup: css`
    height: 100%;
    width: 100%;

    /* prevents duplicate border due to nested filterGroup */
    &::after {
      display: none;
    }

    .euiFilterButton__wrapper {
      height: 100%;
      padding: 0;

      &::before,
      &::after {
        display: none;
      }
    }
  `,
};

export const ControlRendererUsers = memo(() => {
  // popover id for labels and accessibility
  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const { componentApi, displaySettings, customStrings } = useOptionsListContext();

  // popover status (is the filter open?)
  const [isPopoverOpen, setPopoverOpen] = useState<boolean>(false);
  // subscribe to some values via componentAPI subjects
  const [
    existsSelected,
    selectedOptions,
    invalidSelections,
    loading,
    panelTitle,
    defaultPanelTitle,
  ] = useBatchedPublishingSubjects(
    componentApi.existsSelected$,
    componentApi.selectedOptions$,
    componentApi.invalidSelections$,
    componentApi.dataLoading$,
    componentApi.title$,
    componentApi.defaultTitle$ ?? new BehaviorSubject(undefined)
  );

  // Separator for the selected values preview (before opening the filter)
  const styles = useMemoCss(optionListControlStyles);

  // This piece should belong externally in a component that
  // decides which displayNode to render
  const isAssigneeField =
    componentApi.fieldName$.getValue() === 'kibana.alert.workflow_assignee_ids';

  // This piece belongs to the assignee dispayNode
  useEffect(() => {
    if (!isAssigneeField) return;
    const idsToFetch = (selectedOptions ?? [])
      .map(String)
      .filter((id) => id !== NO_ASSIGNEES_OPTION_KEY);
    if (!idsToFetch.length) return;
    // best-effort fetch; if unavailable or forbidden, we'll just render fallback avatars
    bulkGetUserProfilesWithAvatar(idsToFetch).catch(() => {});
  }, [isAssigneeField, selectedOptions]);

  const { hasSelections, selectionDisplayNode, selectedOptionsCount } = useMemo(() => {
    return {
      hasSelections: !isEmpty(selectedOptions),
      selectedOptionsCount: selectedOptions?.length,
      selectionDisplayNode: (
        // The filter preview
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
          <EuiFlexItem css={styles.selectionWrapper} data-test-subj="optionsListSelections">
            <div className="eui-textTruncate">
              {selectedOptions?.length ? (
                <span css={styles.assigneeAvatars} data-test-subj="optionsListAssigneeAvatars">
                  {selectedOptions.map((value) => {
                    const key = String(value);
                    if (key === NO_ASSIGNEES_OPTION_KEY) {
                      return (
                        <span
                          key={key}
                          css={styles.assigneeAvatarWrapper}
                          data-test-subj="optionsListNoAssigneesAvatar"
                        >
                          <EuiToolTip
                            content={OptionsListStrings.controlAndPopover.getNoAssignees()}
                          >
                            <UserAvatar size="s" />
                          </EuiToolTip>
                        </span>
                      );
                    }
                    const profile = getCachedUserProfileWithAvatar(key);
                    const avatar =
                      profile && profile !== null ? (
                        <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
                      ) : (
                        <EuiToolTip content={key}>
                          <UserAvatar size="s" />
                        </EuiToolTip>
                      );
                    return (
                      <span key={key} css={styles.assigneeAvatarWrapper}>
                        {avatar}
                      </span>
                    );
                  })}
                </span>
              ) : null}
            </div>
          </EuiFlexItem>
          {invalidSelections && invalidSelections.size > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  customStrings?.invalidSelectionsLabel ??
                  OptionsListStrings.control.getInvalidSelectionWarningLabel(invalidSelections.size)
                }
                delay="long"
              >
                <EuiToken
                  tabIndex={0}
                  iconType="alert"
                  size="s"
                  color="euiColorVis9"
                  shape="square"
                  fill="dark"
                  title={
                    customStrings?.invalidSelectionsLabel ??
                    OptionsListStrings.control.getInvalidSelectionWarningLabel(
                      invalidSelections.size
                    )
                  }
                  data-test-subj={`optionsList__invalidSelectionsToken-${componentApi.uuid}`}
                  css={styles.invalidSelectionsToken} // Align with the notification badge
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    };
  }, [selectedOptions, invalidSelections, componentApi.uuid, styles, customStrings]);

  const button = (
    <EuiFilterButton
      badgeColor="success"
      isLoading={loading}
      iconType={'arrowDown'}
      data-test-subj={`optionsList-control-${componentApi.uuid}`}
      css={styles.filterButton}
      onClick={() => setPopoverOpen(!isPopoverOpen)}
      isSelected={isPopoverOpen}
      numActiveFilters={selectedOptionsCount}
      hasActiveFilters={Boolean(selectedOptionsCount)}
      textProps={{ css: styles.filterButtonText }}
      aria-label={panelTitle ?? defaultPanelTitle}
      aria-expanded={isPopoverOpen}
      aria-controls={popoverId}
      role="combobox"
    >
      {hasSelections || existsSelected
        ? selectionDisplayNode
        : displaySettings.placeholder ?? OptionsListStrings.control.getPlaceholder()}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup
      className={'kbnGridLayout--hideDragHandle'}
      fullWidth
      compressed={isCompressed(componentApi)}
      css={optionListControlStyles.filterGroup}
      data-control-id={componentApi.uuid}
      data-shared-item
    >
      <EuiInputPopover
        id={popoverId}
        ownFocus
        input={button}
        repositionOnScroll
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        panelMinWidth={MIN_POPOVER_WIDTH}
        className="optionsList__inputButtonOverride"
        css={styles.inputButtonOverride}
        initialFocus={'[data-test-subj=optionsList-control-search-input]'}
        closePopover={() => setPopoverOpen(false)}
        panelClassName="optionsList__popoverOverride"
        panelProps={{
          title: panelTitle ?? defaultPanelTitle,
          'aria-label': OptionsListStrings.popover.getAriaLabel(panelTitle ?? defaultPanelTitle!),
        }}
      >
        <UsersSuggestions />
      </EuiInputPopover>
    </EuiFilterGroup>
  );
});
