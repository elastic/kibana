/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';

import {
  environmentNames,
  ExperimentEnvironment,
  experimentIDs,
  getExperimentIDs,
} from '../../../common';
import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import { experiments, ExperimentID } from '../../../common';
import {
  PresentationExperimentsService,
  isEnabledByStorageValue,
  setStorageStatus,
  setUISettingsStatus,
  applyExperimentStatus,
} from '../experiments';

export type ExperimentsServiceFactory = KibanaPluginServiceFactory<
  PresentationExperimentsService,
  PresentationUtilPluginStartDeps
>;

export const experimentsServiceFactory: ExperimentsServiceFactory = ({ coreStart }) => {
  const { uiSettings } = coreStart;
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;

  const getExperiments = () => mapValues(experiments, (experiment) => getExperiment(experiment.id));

  const getExperiment = (id: ExperimentID) => {
    const experiment = experiments[id];

    const status = {
      session: isEnabledByStorageValue(experiment, 'session', sessionStorage.getItem(id)),
      browser: isEnabledByStorageValue(experiment, 'browser', localStorage.getItem(id)),
      kibana: isEnabledByStorageValue(
        experiment,
        'kibana',
        uiSettings.get(id, experiment.isActive)
      ),
    };

    return applyExperimentStatus(experiment, status);
  };

  const setExperimentStatus = (name: ExperimentID, env: ExperimentEnvironment, status: boolean) => {
    switch (env) {
      case 'session':
        setStorageStatus(sessionStorage, name, status);
        break;
      case 'browser':
        setStorageStatus(localStorage, name, status);
        break;
      case 'kibana':
        setUISettingsStatus(uiSettings, name, status);
        break;
    }
  };

  const reset = () => {
    localStorage.clear();
    sessionStorage.clear();
    environmentNames.forEach((env) =>
      experimentIDs.forEach((id) => setExperimentStatus(id, env, experiments[id].isActive))
    );
  };

  return {
    getExperimentIDs,
    getExperiments,
    getExperiment,
    reset,
    setExperimentStatus,
  };
};
