/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { EuiButton, EuiImage, EuiPageTemplate, EuiSkeletonText, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apiPublishesAwaitingRequiredFilters,
  apiPublishesTitle,
  getTitle,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { useApplyUnpublishedChanges } from '../../../dashboard_api/use_apply_unpublished_changes';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../../services/kibana_services';

/**
 * Titles of the pinned controls still awaiting a required selection. Controls can only report this once
 * mounted, so this is `undefined` until every pinned control has mounted.
 */
const useAwaitingControlLabels = (): string[] | undefined => {
  const dashboardApi = useDashboardApi();
  const [labels, setLabels] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    const subscription = combineLatest([dashboardApi.children$, dashboardApi.layout$])
      .pipe(
        switchMap(([children, { pinnedPanels }]) => {
          const pinnedIds = Object.keys(pinnedPanels);
          if (pinnedIds.some((uuid) => !children[uuid])) return of(undefined);

          const labelStreams = pinnedIds.flatMap((uuid) => {
            const child = children[uuid];
            if (!apiPublishesAwaitingRequiredFilters(child) || !apiPublishesTitle(child)) return [];
            return [
              combineLatest([
                child.awaitingRequiredFilters$,
                child.title$,
                child.defaultTitle$ ?? of(undefined),
              ]).pipe(map(([awaiting]) => (awaiting ? getTitle(child) : undefined))),
            ];
          });
          if (labelStreams.length === 0) return of([]);
          return combineLatest(labelStreams).pipe(
            map((titles) => titles.filter((title): title is string => Boolean(title)))
          );
        })
      )
      .subscribe(setLabels);
    return () => subscription.unsubscribe();
  }, [dashboardApi]);

  return labels;
};

export function AwaitingFiltersScreen() {
  const dashboardApi = useDashboardApi();
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const { hasUnpublishedChanges, applyUnpublishedChanges } = useApplyUnpublishedChanges();

  const labels = useAwaitingControlLabels();
  const isDarkTheme = useKibanaIsDarkMode();

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = coreServices.http.basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'required_filters_dark' : 'required_filters'}.svg`
  );
  // read-only previews (e.g. dashboard history) disable control interaction, so viewers cannot select values
  const isReadOnly = viewMode === 'non-interactive';

  const title = (
    <h2>
      {isReadOnly
        ? i18n.translate('dashboard.emptyScreen.requiredControlsEmptyTitle', {
            defaultMessage: 'Required controls are empty',
          })
        : i18n.translate('dashboard.emptyScreen.awaitingRequiredControlsTitle', {
            defaultMessage: 'Waiting for required controls',
          })}
    </h2>
  );

  // the search bar (and its Apply button) may be hidden, e.g. when embedded, so offer Apply here too
  const showApplyAction =
    !isReadOnly && labels !== undefined && labels.length === 0 && hasUnpublishedChanges;

  const body = (
    <EuiText size="s" color="subdued">
      {labels === undefined ? (
        <EuiSkeletonText
          lines={1}
          size="s"
          isLoading
          data-test-subj="dashboardAwaitingRequiredFiltersSkeleton"
        />
      ) : isReadOnly ? (
        <span data-test-subj="dashboardAwaitingRequiredFiltersReadOnly">
          {i18n.translate('dashboard.emptyScreen.awaitingRequiredControlsReadOnlySubtitle', {
            defaultMessage:
              'This version of the dashboard has required controls without a selected value, so its panels are not shown in this preview.',
          })}
        </span>
      ) : showApplyAction ? (
        <span data-test-subj="dashboardAwaitingPublishSubtitle">
          {i18n.translate('dashboard.emptyScreen.awaitingPublishSubtitle', {
            defaultMessage:
              'All required controls have values. Apply the changes to see this dashboard.',
          })}
        </span>
      ) : (
        <span data-test-subj="dashboardAwaitingRequiredFiltersSubtitle">
          <FormattedMessage
            id="dashboard.emptyScreen.awaitingRequiredControlsSubtitle"
            defaultMessage="{hasLabels, select, true {Select values for {labels} to load this dashboard.} other {Select values in each required control to show the dashboard panels.}}"
            values={{
              hasLabels: labels.length > 0,
              labels: new Intl.ListFormat(i18n.getLocale(), { type: 'conjunction' })
                .formatToParts(labels)
                .map(({ type, value }, index) =>
                  type === 'element' ? <strong key={index}>{value}</strong> : value
                ),
            }}
          />
        </span>
      )}
    </EuiText>
  );

  return (
    <EuiPageTemplate
      css={styles.parent}
      grow={false}
      data-test-subj="dashboardAwaitingRequiredFilters"
    >
      <EuiPageTemplate.EmptyPrompt
        icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
        title={title}
        body={body}
        actions={
          showApplyAction ? (
            <EuiButton
              fill
              size="s"
              iconType="check"
              onClick={applyUnpublishedChanges}
              data-test-subj="dashboardAwaitingRequiredFiltersApply"
            >
              {i18n.translate('dashboard.emptyScreen.awaitingPublishApplyButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          ) : undefined
        }
        titleSize="xs"
        color="transparent"
      />
    </EuiPageTemplate>
  );
}

const styles = {
  parent: css({
    display: 'flex',
    flexGrow: 1,
    height: '100%',
  }),
};
