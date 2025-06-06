/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { InspectorViewDescription } from '@kbn/inspector-plugin/public';
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { InspectorAdapters } from '../../application/main/hooks/use_inspector';

const ProfilesInspectorViewComponent = dynamic(() => import('./profiles_inspector_view'));

export const getProfilesInspectorView = (): InspectorViewDescription => ({
  title: i18n.translate('discover.inspector.profilesInspectorViewTitle', {
    defaultMessage: 'Profiles',
  }),
  order: 20,
  help: i18n.translate('discover.inspector.profilesInspectorViewHelpText', {
    defaultMessage: 'View the active Discover profiles',
  }),
  shouldShow(adapters: InspectorAdapters) {
    return Boolean(adapters.profiles);
  },
  component: ({ adapters: { profiles } }: { adapters: InspectorAdapters }) => {
    if (!profiles) {
      return null;
    }

    return <ProfilesInspectorViewComponent profilesAdapter={profiles} />;
  },
});
