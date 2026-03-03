/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProfileSection } from './profile_section';
import type { Contexts } from '../../hooks/use_active_contexts';

export function DataSourceProfileSection({
  dataSourceContext,
}: {
  dataSourceContext: Contexts['dataSourceContext'];
}) {
  return (
    <ProfileSection
      title={i18n.translate('discover.inspector.profilesInspectorView.dataSourceProfileTitle', {
        defaultMessage: 'Data source profile',
      })}
    >
      <EuiDescriptionList
        listItems={[
          {
            title: i18n.translate(
              'discover.inspector.profilesInspectorView.dataSourceProfileIdTitle',
              {
                defaultMessage: 'Profile ID',
              }
            ),
            description: dataSourceContext.profileId,
          },
          {
            title: i18n.translate(
              'discover.inspector.profilesInspectorView.dataSourceCategoryTitle',
              {
                defaultMessage: 'Category',
              }
            ),
            description: dataSourceContext.category,
          },
        ]}
      />
    </ProfileSection>
  );
}
