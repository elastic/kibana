/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as React from 'react';
import { DashboardContainerInput } from './dashboard_container';
import { DashboardContainerFactory } from './dashboard_container_factory';
import { EmbeddableRenderer } from '../../services/embeddable';

interface Props {
  input: DashboardContainerInput;
  onInputUpdated?: (newInput: DashboardContainerInput) => void;
  // TODO: add other props as needed
}

export const createDashboardContainerByValueRenderer = ({
  factory,
}: {
  factory: DashboardContainerFactory;
}): React.FC<Props> => (props: Props) => (
  <EmbeddableRenderer input={props.input} onInputUpdated={props.onInputUpdated} factory={factory} />
);
