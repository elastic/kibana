/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useRef, useState, useEffect } from 'react';
import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
} from '@elastic/eui';

import {
  ExperimentSolution,
  ExperimentStatus,
  ExperimentID,
  Experiment,
  ExperimentEnvironment,
} from '../../../common';
import { pluginServices } from '../../services';
import { ExperimentsStrings } from '../../i18n';

import { ExperimentsList } from './experiments_list';

const { Flyout: strings } = ExperimentsStrings.Components;

export interface Props {
  onClose: () => void;
  solutions?: ExperimentSolution[];
  onEnabledCountChange?: (overrideCount: number) => void;
}

const hasStatusChanged = (
  original: Record<ExperimentID, Experiment>,
  current: Record<ExperimentID, Experiment>
): boolean => {
  for (const id of Object.keys(original) as ExperimentID[]) {
    for (const key of Object.keys(original[id].status) as Array<keyof ExperimentStatus>) {
      if (original[id].status[key] !== current[id].status[key]) {
        return true;
      }
    }
  }
  return false;
};

export const getOverridenCount = (experiments: Record<ExperimentID, Experiment>) =>
  Object.values(experiments).filter((experiment) => experiment.status.isOverride).length;

export const ExperimentsFlyout = (props: Props) => {
  const { solutions, onEnabledCountChange = () => {}, onClose } = props;
  const { experiments: experimentsService } = pluginServices.getHooks();
  const { getExperiments, setExperimentStatus, reset } = experimentsService.useService();

  const [experiments, setExperiments] = useState(getExperiments());
  const [overrideCount, setOverrideCount] = useState(getOverridenCount(experiments));
  const initialStatus = useRef(getExperiments());

  const isChanged = hasStatusChanged(initialStatus.current, experiments);

  useEffect(() => {
    setOverrideCount(getOverridenCount(experiments));
  }, [experiments]);

  useEffect(() => {
    onEnabledCountChange(overrideCount);
  }, [onEnabledCountChange, overrideCount]);

  const onStatusChange = (id: ExperimentID, env: ExperimentEnvironment, enabled: boolean) => {
    setExperimentStatus(id, env, enabled);
    setExperiments(getExperiments());
  };

  let footer: ReactNode = null;

  const resetButton = (
    <EuiButtonEmpty
      onClick={() => {
        reset();
        setExperiments(getExperiments());
      }}
      isDisabled={!overrideCount}
    >
      {strings.getResetToDefaultLabel()}
    </EuiButtonEmpty>
  );

  const refreshButton = (
    <EuiButton
      color="primary"
      fill={true}
      onClick={() => {
        window.location.reload();
      }}
      isDisabled={!isChanged}
    >
      {strings.getRefreshLabel()}
    </EuiButton>
  );

  footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>{resetButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>{refreshButton}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="beaker" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>{strings.getTitleLabel()}</EuiFlexItem>
            </EuiFlexGroup>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ExperimentsList {...{ experiments, solutions, onStatusChange }} />
      </EuiFlyoutBody>
      {footer}
    </EuiFlyout>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ExperimentsList;
