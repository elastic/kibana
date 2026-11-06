/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { describeLastRunShape, parseStepOutputReference } from '../lib/last_run_shape';
import { useLastRunOutput } from '../model/use_last_run_output';

/** The workflow whose runs a chip's hover may look at. Without it a hover shows the declared type only. */
const LastRunWorkflowIdContext = createContext<string | undefined>(undefined);

export const LastRunWorkflowIdProvider = LastRunWorkflowIdContext.Provider;

interface LastRunHintProps {
  readonly hint: string;
  readonly expression: string;
}

/**
 * The tooltip content of a reference chip: the declared hint, plus what the referenced step's
 * last run held there. A tooltip renders its content only while open, so nothing is fetched
 * until someone hovers.
 */
export const LastRunHint = ({ hint, expression }: LastRunHintProps) => {
  const workflowId = useContext(LastRunWorkflowIdContext);
  const reference = workflowId ? parseStepOutputReference(expression) : undefined;
  if (!workflowId || !reference) return <>{hint}</>;
  return (
    <LastRunHintWithShape
      hint={hint}
      workflowId={workflowId}
      stepName={reference.stepName}
      path={reference.path}
    />
  );
};

const LastRunHintWithShape = ({
  hint,
  workflowId,
  stepName,
  path,
}: {
  readonly hint: string;
  readonly workflowId: string;
  readonly stepName: string;
  readonly path: readonly string[];
}) => {
  const { output } = useLastRunOutput(workflowId, stepName);
  const shape = describeLastRunShape(output, path);
  if (!shape) return <>{hint}</>;
  return (
    <>
      <div>{hint}</div>
      <div>
        {i18n.translate('workflows.stepConfigPanel.lastRunShape.inLastRun', {
          defaultMessage: '{shape} in the last run',
          values: { shape },
        })}
      </div>
    </>
  );
};
