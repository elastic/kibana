/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import {
  ExperimentEnvironment,
  experimentIDs,
  Experiment,
  ExperimentConfig,
  ExperimentID,
  EnvironmentStatus,
  environmentNames,
  isExperimentEnabledByStatus,
} from '../../common';

export interface PresentationExperimentsService {
  getExperimentIDs: () => typeof experimentIDs;
  getExperiment: (id: ExperimentID) => Experiment;
  getExperiments: () => Record<ExperimentID, Experiment>;
  setExperimentStatus: (id: ExperimentID, env: ExperimentEnvironment, status: boolean) => void;
  reset: () => void;
}

export const isEnabledByStorageValue = (
  experiment: ExperimentConfig,
  environment: ExperimentEnvironment,
  value: string | boolean | null
): boolean => {
  const defaultValue = experiment.isActive;

  if (!experiment.environments.includes(environment)) {
    return defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  if (value === 'enabled') {
    return true;
  }

  if (value === 'disabled') {
    return false;
  }

  return defaultValue;
};

export const setStorageStatus = (storage: Storage, id: ExperimentID, enabled: boolean) =>
  storage.setItem(id, enabled ? 'enabled' : 'disabled');

export const applyExperimentStatus = (
  experiment: ExperimentConfig,
  status: EnvironmentStatus
): Experiment => {
  const { isActive, environments } = experiment;

  environmentNames.forEach((name) => {
    if (!environments.includes(name)) {
      delete status[name];
    }
  });

  const isEnabled = isExperimentEnabledByStatus(isActive, status);
  const isOverride = isEnabled !== isActive;

  return {
    ...experiment,
    status: {
      ...status,
      defaultValue: isActive,
      isEnabled,
      isOverride,
    },
  };
};

export const setUISettingsStatus = (
  client: IUiSettingsClient,
  id: ExperimentID,
  enabled: boolean
) => client.set(id, enabled);
