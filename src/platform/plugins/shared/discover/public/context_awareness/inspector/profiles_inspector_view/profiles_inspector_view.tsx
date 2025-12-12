/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { DataSourceProfileSection } from './data_source_profile_section';
import { RootProfileSection } from './root_profile_section';
import { DocumentProfilesSection } from './document_profiles_section';
import type { ContextsAdapter } from '../../hooks';

export function ProfilesInspectorView({ contextsAdapter }: { contextsAdapter: ContextsAdapter }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="profilesInspectorView"
      css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s }}
    >
      <RootProfileSection rootContext={contextsAdapter.getRootContext()} />
      <DataSourceProfileSection dataSourceContext={contextsAdapter.getDataSourceContext()} />
      <DocumentProfilesSection
        onViewRecordDetails={contextsAdapter.openDocDetails}
        documentContexts={contextsAdapter.getDocumentContexts()}
      />
    </div>
  );
}
