/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ToolbarButton, Props as ToolbarButtonProps } from '../primary/primary';

export type Props = Omit<ToolbarButtonProps, 'iconType' | 'label'>;

const label = {
  getLibraryButtonLabel: () =>
    i18n.translate('sharedUXComponents.toolbar.buttons.addFromLibrary.libraryButtonLabel', {
      defaultMessage: 'Add from library',
    }),
};

export const AddFromLibraryButton = ({ onClick, ...rest }: Props) => (
  <ToolbarButton {...rest} iconType="folderOpen" label={label.getLibraryButtonLabel()} />
);
