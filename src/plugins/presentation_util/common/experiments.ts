/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const UNIFIED_TOOLBAR = 'presentation:unifiedToolbar';
export const TIME_TO_PRESENT = 'canvas:timeToPresent';

export const experimentIDs = [UNIFIED_TOOLBAR, TIME_TO_PRESENT] as const;
export const environmentNames = ['kibana', 'browser', 'session'] as const;
export const solutionNames = ['canvas', 'dashboard', 'presentation'] as const;

export type ExperimentID = typeof experimentIDs[number];
export type ExperimentEnvironment = typeof environmentNames[number];
export type PresentationSolution = typeof solutionNames[number];

export type EnvironmentStatus = {
  [env in ExperimentEnvironment]?: boolean;
};

export type ExperimentStatus = { defaultValue: boolean; isEnabled: boolean } & EnvironmentStatus;
export interface ExperimentConfig {
  id: ExperimentID;
  name: string;
  isActive: boolean;
  environments: ExperimentEnvironment[];
  description: string;
  solutions: PresentationSolution[];
}

export type Experiment = ExperimentConfig & { status: ExperimentStatus };

export const getExperimentIDs = () => experimentIDs;

export const isExperimentEnabledByStatus = (
  active: boolean,
  status: EnvironmentStatus
): boolean => {
  // If the experiment is enabled by default, then any false flag will flip the switch, and vice-versa.
  return active
    ? Object.values(status).every((value) => value === true)
    : Object.values(status).some((value) => value === true);
};

/**
 * This is a list of active experiments for the Presentation Team.  It is the "source of truth" for all experiments
 * provided to users of our solutions in Kibana.
 */
export const experiments: { [ID in ExperimentID]: ExperimentConfig & { id: ID } } = {
  [UNIFIED_TOOLBAR]: {
    id: UNIFIED_TOOLBAR,
    isActive: false,
    environments: ['kibana', 'browser', 'session'],
    name: i18n.translate('presentationUtil.experiments.enableUnifiedToolbarExperimentName', {
      defaultMessage: 'Unified Toolbar',
    }),
    description: i18n.translate(
      'presentationUtil.experiments.enableUnifiedToolbarExperimentDescription',
      {
        defaultMessage: 'Enable the new unified toolbar design for Presentation solutions',
      }
    ),
    solutions: ['dashboard', 'canvas'],
  },
  [TIME_TO_PRESENT]: {
    id: TIME_TO_PRESENT,
    isActive: false,
    environments: ['kibana', 'browser', 'session'],
    name: i18n.translate('presentationUtil.experiments.enableTimeToPresentExperimentName', {
      defaultMessage: 'Time to Present',
    }),
    description: i18n.translate(
      'presentationUtil.experiments.enableTimeToPresentExperimentDescription',
      {
        defaultMessage:
          'A set of features that shifts Canvas more toward Presentations and less toward Dashboards',
      }
    ),
    solutions: ['canvas'],
  },
};
