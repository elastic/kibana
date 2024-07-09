/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { ProfilesAdapter } from './profiles_adapter';

interface AdaptersWithProfilesAdapter extends Adapters {
  profiles?: ProfilesAdapter;
}

const ProfilesInspectorViewComponent = dynamic(() => import('./profiles_inspector_view_component'));

export const getProfilesInspectorViewDescription = (): InspectorViewDescription => ({
  title: i18n.translate('discover.inspector.profilesInspectorViewTitle', {
    defaultMessage: 'Profiles',
  }),
  order: 20,
  help: i18n.translate('discover.inspector.profilesInspectorViewHelpText', {
    defaultMessage: 'View the active Discover profiles',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.profiles);
  },
  component: ({ adapters: { profiles } }: { adapters: AdaptersWithProfilesAdapter }) => {
    if (!profiles) {
      return null;
    }

    return <ProfilesInspectorViewComponent profilesAdapter={profiles} />;
  },
});
