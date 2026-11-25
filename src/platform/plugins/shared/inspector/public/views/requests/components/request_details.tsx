/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import { useIsCpsMultiProject } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import type { Request } from '../../../../common/adapters/request/types';
import { getNextTab } from './get_next_tab';
import type { DetailViewData, InspectorKibanaServices } from './types';

import {
  ClustersView,
  ProjectsView,
  RequestDetailsRequest,
  RequestDetailsResponse,
  RequestDetailsStats,
} from './details';

interface Props {
  initialTabs?: string[];
  request: Request;
}

const DETAILS: DetailViewData[] = [
  {
    name: 'Statistics',
    label: i18n.translate('inspector.requests.statisticsTabLabel', {
      defaultMessage: 'Statistics',
    }),
    component: RequestDetailsStats,
  },
  {
    name: 'Clusters',
    label: i18n.translate('inspector.requests.clustersTabLabel', {
      defaultMessage: 'Clusters and shards',
    }),
    component: ClustersView,
  },
  {
    name: 'Projects',
    label: i18n.translate('inspector.requests.projectsTabLabel', {
      defaultMessage: 'Projects',
    }),
    component: ProjectsView,
  },
  {
    name: 'Request',
    label: i18n.translate('inspector.requests.requestTabLabel', {
      defaultMessage: 'Request',
    }),
    component: RequestDetailsRequest,
  },
  {
    name: 'Response',
    label: i18n.translate('inspector.requests.responseTabLabel', {
      defaultMessage: 'Response',
    }),
    component: RequestDetailsResponse,
  },
];

export function RequestDetails(props: Props) {
  const [availableDetails, setAvailableDetails] = useState<DetailViewData[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DetailViewData | null>(null);
  const { services } = useKibana<InspectorKibanaServices>();
  // undefined while CPS is still loading; only a definitive `true` swaps the tabs
  const isCpsMultiProject = useIsCpsMultiProject(services.cpsManager) === true;

  useEffect(() => {
    const nextAvailableDetails = DETAILS.filter((detail: DetailViewData) =>
      detail.component.shouldShow?.(props.request, isCpsMultiProject)
    );

    setAvailableDetails(nextAvailableDetails);

    setSelectedDetail((prevSelectedDetail) => {
      // If the previously selected detail is still available we want to stay
      // on this tab and not set another selectedDetail.
      if (
        prevSelectedDetail &&
        nextAvailableDetails.find(({ name }) => name === prevSelectedDetail.name)
      ) {
        return prevSelectedDetail;
      }

      return getNextTab(prevSelectedDetail, nextAvailableDetails, props.initialTabs);
    });
  }, [props.initialTabs, props.request, isCpsMultiProject]);

  return selectedDetail ? (
    <>
      <EuiTabs size="s">
        {availableDetails.map((detail) => (
          <EuiTab
            key={detail.name}
            isSelected={detail.name === selectedDetail.name}
            onClick={() => {
              if (detail.name !== selectedDetail.name) {
                setSelectedDetail(detail);
              }
            }}
            data-test-subj={`inspectorRequestDetail${detail.name}`}
          >
            {detail.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <selectedDetail.component key={props.request.id} request={props.request} />
    </>
  ) : null;
}
