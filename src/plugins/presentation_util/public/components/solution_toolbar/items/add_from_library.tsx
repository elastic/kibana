/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStrings } from '../../../i18n/components';
import { SolutionToolbarButton, Props as SolutionToolbarButtonProps } from './button';

const { SolutionToolbar: strings } = ComponentStrings;

export type Props = Pick<SolutionToolbarButtonProps, 'onClick'>;

export const AddFromLibraryButton = ({ onClick }: Props) => (
  <SolutionToolbarButton
    iconType="folderOpen"
    onClick={onClick}
    label={strings.getLibraryButtonLabel()}
  />
);
