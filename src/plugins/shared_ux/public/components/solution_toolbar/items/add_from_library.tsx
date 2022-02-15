/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { SolutionToolbarButton, Props as SolutionToolbarButtonProps } from './button';

const strings = {
  getLibraryButtonLabel: () =>
    i18n.translate('sharedUX.solutionToolbar.libraryButtonLabel', {
      defaultMessage: 'Add from library',
    }),
};

export type Props = Omit<SolutionToolbarButtonProps, 'iconType' | 'label'>;

export const AddFromLibraryButton = ({ ...props }: Props) => (
  <SolutionToolbarButton label={strings.getLibraryButtonLabel()} iconType="folderOpen" {...props} />
);
