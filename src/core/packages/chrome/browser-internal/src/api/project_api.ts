/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  AppDeepLinkId,
  ChromeBreadcrumb,
  ChromeProjectNavigationNode,
  ChromeSetProjectBreadcrumbsParams,
  ChromeStyle,
  CloudURLs,
  NavigationTreeDefinition,
  NavigationTreeDefinitionUI,
  SolutionId,
  SolutionNavigationDefinitions,
} from '@kbn/core-chrome-browser';
import type { ProjectNavigationService } from '../services/project_navigation';
import type { State } from '../state/state_helpers';

type ProjectNavigationStart = ReturnType<ProjectNavigationService['start']>;

export interface ProjectApi {
  setHome: (homeHref: string) => void;
  setCloudUrls: (cloudUrls: CloudURLs) => void;
  setFeedbackUrlParams: (feedbackUrlParams: URLSearchParams) => void;
  setKibanaName: (kibanaName: string) => void;
  initNavigation: <
    LinkId extends AppDeepLinkId = AppDeepLinkId,
    Id extends string = string,
    ChildrenId extends string = Id
  >(
    id: SolutionId,
    navigationTree$: Observable<NavigationTreeDefinition<LinkId, Id, ChildrenId>>,
    config?: { dataTestSubj?: string }
  ) => void;
  getNavigationTreeUi$: () => Observable<NavigationTreeDefinitionUI>;
  setBreadcrumbs: (
    breadcrumbs: ChromeBreadcrumb[] | ChromeBreadcrumb,
    params?: ChromeSetProjectBreadcrumbsParams
  ) => void;
  getBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
  getActiveNavigationNodes$: () => Observable<ChromeProjectNavigationNode[][]>;
  updateSolutionNavigations: (
    solutionNavs: SolutionNavigationDefinitions,
    replace?: boolean
  ) => void;
  changeActiveSolutionNavigation: (id: SolutionId | null) => void;
}

export interface ProjectApiDeps {
  projectNavigation: ProjectNavigationStart;
  chromeStyle: State<ChromeStyle | undefined>;
}

export function createProjectApi({ projectNavigation, chromeStyle }: ProjectApiDeps): ProjectApi {
  const validateProjectStyle = () => {
    const style = chromeStyle.get();
    if (style !== 'project') {
      throw new Error(
        `Invalid ChromeStyle value of "${style}". This method requires ChromeStyle set to "project".`
      );
    }
  };

  return {
    setHome: (homeHref: string) => {
      validateProjectStyle();
      projectNavigation.setProjectHome(homeHref);
    },
    setCloudUrls: projectNavigation.setCloudUrls.bind(projectNavigation),
    setFeedbackUrlParams: projectNavigation.setFeedbackUrlParams.bind(projectNavigation),
    setKibanaName: (kibanaName: string) => {
      projectNavigation.setKibanaName(kibanaName);
    },
    initNavigation: (id, navigationTree$, config) => {
      validateProjectStyle();
      projectNavigation.initNavigation(id, navigationTree$, config);
    },
    getNavigationTreeUi$: () => projectNavigation.getNavigationTreeUi$(),
    setBreadcrumbs: (breadcrumbs, params) => {
      projectNavigation.setProjectBreadcrumbs(breadcrumbs, params);
    },
    getBreadcrumbs$: () => projectNavigation.getProjectBreadcrumbs$(),
    getActiveNavigationNodes$: () => projectNavigation.getActiveNodes$(),
    updateSolutionNavigations: projectNavigation.updateSolutionNavigations,
    changeActiveSolutionNavigation: projectNavigation.changeActiveSolutionNavigation,
  };
}
