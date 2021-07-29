/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { DISCOVER_VIEW_MODES } from './constants';

// @todo: Revisit naming/terminology
const toggleButtons = [
  {
    id: DISCOVER_VIEW_MODES.DOCUMENT_LEVEL,
    label: 'Document view',
  },
  {
    id: DISCOVER_VIEW_MODES.FIELD_LEVEL,
    label: 'Aggregated view',
  },
];

export const DocumentViewModeToggle = ({
  discoverViewMode,
  setDiscoverViewMode,
}: {
  discoverViewMode: string;
  setDiscoverViewMode: (id: string) => void;
}) => {
  return (
    <EuiButtonGroup
      legend={i18n.translate('discover.viewModes.legend', { defaultMessage: 'Document view mode' })}
      color={'primary'}
      style={{ paddingRight: 20 }}
      buttonSize={'s'}
      options={toggleButtons}
      idSelected={discoverViewMode}
      onChange={(id: string) => setDiscoverViewMode(id)}
    />
  );
};
