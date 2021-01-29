/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState } from 'react';
import { action } from '@storybook/addon-actions';

import { StorybookParams } from '../services/storybook';
import { SaveModalDashboardSelector } from './saved_object_save_modal_dashboard_selector';

export default {
  component: SaveModalDashboardSelector,
  title: 'Save Modal Dashboard Selector',
  description: 'A selector for determining where an object will be saved after it is created.',
  argTypes: {
    hasDocumentId: {
      control: 'boolean',
      defaultValue: false,
    },
    copyOnSave: {
      control: 'boolean',
      defaultValue: false,
    },
    canCreateNewDashboards: {
      control: 'boolean',
      defaultValue: true,
    },
    canEditDashboards: {
      control: 'boolean',
      defaultValue: true,
    },
  },
};

export function Example({
  copyOnSave,
  hasDocumentId,
}: {
  copyOnSave: boolean;
  hasDocumentId: boolean;
} & StorybookParams) {
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing' | null>('existing');

  return (
    <SaveModalDashboardSelector
      onSelectDashboard={action('onSelect')}
      onChange={setDashboardOption}
      dashboardOption={dashboardOption}
      copyOnSave={copyOnSave}
      documentId={hasDocumentId ? 'abc' : undefined}
    />
  );
}
