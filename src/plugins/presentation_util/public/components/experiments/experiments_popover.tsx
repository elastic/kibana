/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React, { useRef, useState } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiCallOut,
  EuiPopoverProps,
} from '@elastic/eui';

import { ExperimentSolution } from '../../../common';
import { pluginServices } from '../../services';
import { ExperimentsStrings } from '../../i18n';
import { ExperimentPanel } from './experiment_panel';

import './experiments_popover.scss';

const { Popover: strings } = ExperimentsStrings.Components;

export interface Props extends Omit<EuiPopoverProps, 'children'> {
  solutions?: ExperimentSolution[];
}

export const ExperimentsPopover = (props: Props) => {
  const { solutions, ...rest } = props;
  const { experiments: experimentsService } = pluginServices.getHooks();
  const { getExperiments, setExperimentStatus, reset } = experimentsService.useService();

  const [experiments, setExperiments] = useState(getExperiments());
  const initialStatus = useRef(getExperiments());

  return (
    <EuiPopover {...{ ...rest }}>
      <EuiPopoverTitle>Available Experiments</EuiPopoverTitle>
      {Object.values(experiments).map((experiment) => {
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
        {!isEqual(initialStatus.current, experiments) ? (
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
