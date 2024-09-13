/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { MouseEventHandler } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';

import { ProjectType } from '@kbn/serverless-types';

import { icons } from './constants';

export const TEST_ID = 'projectSwitcherButton';

export interface Props {
  onClick: MouseEventHandler<HTMLButtonElement>;
  currentProjectType: ProjectType;
}

export const HeaderButton = ({ onClick, currentProjectType }: Props) => (
  <EuiHeaderSectionItemButton
    aria-label="Developer Tools"
    data-test-subj={TEST_ID}
    {...{ onClick }}
  >
    <EuiIcon type={icons[currentProjectType]} size="m" />
  </EuiHeaderSectionItemButton>
);
