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
import type { ProfilesAdapter } from '../../../application/main/hooks/use_active_profiles';
import { DataSourceProfileSection } from './data_source_profile_section';
import { RootProfileSection } from './root_profile_section';
import { DocumentsProfilesSection } from './documents_profiles_display';

export function ProfilesInspectorView({ profilesAdapter }: { profilesAdapter: ProfilesAdapter }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s }}>
      <RootProfileSection rootProfile={profilesAdapter.getRootProfile()} />
      <DataSourceProfileSection dataSourceProfile={profilesAdapter.getDataSourceProfile()} />
      <DocumentsProfilesSection
        onViewRecordDetails={profilesAdapter.openDocDetails}
        documentsProfiles={profilesAdapter.getDocumentsProfiles()}
      />
    </div>
  );
}
