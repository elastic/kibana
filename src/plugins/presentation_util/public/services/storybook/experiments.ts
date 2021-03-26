/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExperimentEnvironment, experimentIDs, Experiment } from '../../../common';
import { PluginServiceFactory } from '../create';
import { experiments, ExperimentID, getExperimentIDs } from '../../../common';
import {
  PresentationExperimentsService,
  isEnabledByStorageValue,
  applyExperimentStatus,
} from '../experiments';

export type ExperimentsServiceFactory = PluginServiceFactory<PresentationExperimentsService>;

export const experimentsServiceFactory: ExperimentsServiceFactory = () => {
  const storage = window.sessionStorage;

  const getExperiments = () =>
    experimentIDs.reduce((acc, id) => {
      acc[id] = getExperiment(id);
      return acc;
    }, {} as { [id in ExperimentID]: Experiment });

  const getExperiment = (id: ExperimentID) => {
    const experiment = experiments[id];
    const { isActive } = experiment;
    const status = {
      session: isEnabledByStorageValue(experiment, 'session', sessionStorage.getItem(id)),
      browser: isEnabledByStorageValue(experiment, 'browser', localStorage.getItem(id)),
      kibana: isActive,
    };
    return applyExperimentStatus(experiment, status);
  };

  const setExperimentStatus = (
    name: ExperimentID,
    env: ExperimentEnvironment,
    enabled: boolean
  ) => {
    if (env === 'session') {
      storage.setItem(name, enabled ? 'enabled' : 'disabled');
    }
  };

  const reset = () => {
    storage.clear();
  };

  return {
    getExperimentIDs,
    getExperiments,
    getExperiment,
    reset,
    setExperimentStatus,
  };
};
