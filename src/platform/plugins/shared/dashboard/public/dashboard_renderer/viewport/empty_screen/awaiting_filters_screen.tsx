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

import { EuiImage, EuiPageTemplate, EuiSkeletonText, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apiPublishesAwaitingRequiredFilters,
  apiPublishesTitle,
  getTitle,
} from '@kbn/presentation-publishing';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

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
  const labels = useAwaitingControlLabels();
  const isDarkTheme = useKibanaIsDarkMode();

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = coreServices.http.basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'required_filters_dark' : 'required_filters'}.svg`
  );

  const title = (() => {
    const titleString = i18n.translate('dashboard.emptyScreen.awaitingRequiredControlsTitle', {
      defaultMessage: 'Waiting for required controls',
    });
    return <h2>{titleString}</h2>;
  })();

  const body = (
    <EuiText size="s" color="subdued">
      {labels === undefined ? (
        <EuiSkeletonText
          lines={1}
          size="s"
          isLoading
          data-test-subj="dashboardAwaitingRequiredFiltersSkeleton"
        />
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
