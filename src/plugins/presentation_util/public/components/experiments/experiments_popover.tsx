/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiCallOut,
  EuiPopoverProps,
} from '@elastic/eui';

import { ExperimentSolution, ExperimentStatus, ExperimentID, Experiment } from '../../../common';
import { pluginServices } from '../../services';
import { ExperimentsStrings } from '../../i18n';
import { ExperimentPanel } from './experiment_panel';

import './experiments_popover.scss';

const { Popover: strings } = ExperimentsStrings.Components;

export interface Props extends Omit<EuiPopoverProps, 'children'> {
  solutions?: ExperimentSolution[];
}

const statusHasChanged = (
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

export const ExperimentsPopover = (props: Props) => {
  const { solutions, ...rest } = props;
  const { experiments: experimentsService } = pluginServices.getHooks();
  const { getExperiments, setExperimentStatus, reset } = experimentsService.useService();

  const [experiments, setExperiments] = useState(getExperiments());
  const initialStatus = useRef(getExperiments());

  const isChanged = statusHasChanged(initialStatus.current, experiments);

  return (
    <EuiPopover {...{ ...rest }}>
      <EuiPopoverTitle>Available Experiments</EuiPopoverTitle>
      {Object.values(experiments).map((experiment) => {
        // Filter out any panels that don't match the solutions filter, (if provided).
        if (solutions && !solutions.some((solution) => experiment.solutions.includes(solution))) {
          return null;
        }

        return (
          <ExperimentPanel
            experiment={experiment}
            key={experiment.id}
            onStatusChange={(id, env, enabled) => {
              setExperimentStatus(id, env, enabled);
              setExperiments(getExperiments());
            }}
          />
        );
      })}
      <EuiPopoverFooter className="experimentsPopover__footer">
        {isChanged ? (
          <EuiCallOut
            className="experimentsPopover__callout"
            size="s"
            title={strings.getCalloutHelp()}
          />
        ) : null}
        <EuiButton
          className="experimentsPopover__reset"
          color="danger"
          size="s"
          onClick={() => {
            reset();
            setExperiments(getExperiments());
          }}
        >
          {strings.getResetButtonLabel()}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ExperimentsPopover;
