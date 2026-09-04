/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSearchBar,
  EuiSpacer,
  type EuiSearchBarOnChangeArgs,
  type Query,
  type SearchFilterConfig,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchProjects } from '@kbn/cps-utils';
import type { Request } from '../../../../../../common/adapters/request/types';
import type { InspectorKibanaServices } from '../../types';
import type { DetailViewProps } from '../types';
import { ClusterHealth, type ClusterHealthStatus } from '../clusters_view/clusters_health';
import { ClustersView } from '../clusters_view/clusters_view';
import { findClusters } from '../clusters_view/find_clusters';
import { joinClustersToProjects, type ProjectClusterItem } from './join_clusters_to_projects';
import { ProjectsTable } from './projects_table';

const uniqueValues = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].sort();

export const ProjectsView = ({ request }: DetailViewProps) => {
  const { services } = useKibana<InspectorKibanaServices>();
  const cpsManager = services.cpsManager;
  const [query, setQuery] = useState<Query | undefined>();

  const effectiveRouting = useMemo(() => {
    return cpsManager?.getProjectRouting() ?? cpsManager?.getDefaultProjectRouting();
  }, [cpsManager]);

  const fetchProjects = useCallback(
    async () =>
      effectiveRouting && cpsManager ? cpsManager.fetchProjects(effectiveRouting) : null,
    [cpsManager, effectiveRouting]
  );

  // resolves to empty projects on missing privileges (null) or fetch errors,
  // in which case the table renders unenriched cluster rows
  const { originProject, linkedProjects } = useFetchProjects(fetchProjects);

  const allItems = useMemo(
    () => joinClustersToProjects(findClusters(request), originProject, linkedProjects),
    [request, originProject, linkedProjects]
  );

  const visibleItems = useMemo(
    () =>
      query ? EuiSearchBar.Query.execute(query, allItems, { defaultFields: ['name'] }) : allItems,
    [allItems, query]
  );

  const filters = useMemo<SearchFilterConfig[]>(() => {
    const optionsOf = (values: Array<string | undefined>) =>
      uniqueValues(values).map((value) => ({ value }));

    return [
      {
        type: 'field_value_selection',
        field: 'status',
        name: i18n.translate('inspector.requests.projects.view.statusFilterLabel', {
          defaultMessage: 'Last status',
        }),
        multiSelect: 'or',
        options: (['successful', 'partial', 'skipped', 'failed'] as ClusterHealthStatus[]).map(
          (status) => ({
            value: status,
            view: <ClusterHealth status={status} textProps={{ size: 'm', color: 'text' }} />,
          })
        ),
      },
      {
        type: 'field_value_selection',
        field: 'provider',
        name: i18n.translate('inspector.requests.projects.view.providerFilterLabel', {
          defaultMessage: 'Provider',
        }),
        multiSelect: 'or',
        options: optionsOf(allItems.map(({ provider }) => provider)),
      },
      {
        type: 'field_value_selection',
        field: 'region',
        name: i18n.translate('inspector.requests.projects.view.regionFilterLabel', {
          defaultMessage: 'Region',
        }),
        multiSelect: 'or',
        options: optionsOf(allItems.map(({ region }) => region)),
      },
      {
        type: 'field_value_selection',
        field: 'tags',
        name: i18n.translate('inspector.requests.projects.view.tagsFilterLabel', {
          defaultMessage: 'Tags',
        }),
        multiSelect: 'or',
        options: optionsOf(allItems.flatMap(({ tags }) => tags)),
      },
    ];
  }, [allItems]);

  const onSearchChange = ({ query: nextQuery, error }: EuiSearchBarOnChangeArgs) => {
    if (!error) {
      setQuery(nextQuery ?? undefined);
    }
  };

  return (
    <>
      <EuiSpacer size="m" />
      {allItems.length > 1 ? (
        <>
          <EuiSearchBar
            box={{
              placeholder: i18n.translate('inspector.requests.projects.view.searchBarPlaceholder', {
                defaultMessage: 'Search by project alias',
              }),
              incremental: true,
            }}
            filters={filters}
            onChange={onSearchChange}
            data-test-subj="inspectorRequestProjectsSearchBar"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <ProjectsTable items={visibleItems as ProjectClusterItem[]} />
    </>
  );
};

// A project row is derived from the same per-cluster response details as the Clusters view,
// to avoid recreating the logic at the moment we want to show the projects view when the clusters view is not shown
ProjectsView.shouldShow = (request: Request, isCpsMultiProject?: boolean) =>
  !!isCpsMultiProject && ClustersView.shouldShow(request);
