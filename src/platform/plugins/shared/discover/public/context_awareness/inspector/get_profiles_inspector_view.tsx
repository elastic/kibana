/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import React, { lazy } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { ContextsAdapter } from '../hooks';

const ProfilesInspectorViewComponent = withSuspense(
  lazy(() => import('./profiles_inspector_view'))
);

export interface InspectorAdapters extends Adapters {
  contexts?: ContextsAdapter;
}

export const getProfilesInspectorView = (): InspectorViewDescription => ({
  title: i18n.translate('discover.inspector.profilesInspectorViewTitle', {
    defaultMessage: 'Profiles',
  }),
  order: 20,
  help: i18n.translate('discover.inspector.profilesInspectorViewHelpText', {
    defaultMessage: 'View the active Discover profiles',
  }),
  shouldShow(adapters: InspectorAdapters) {
    return Boolean(adapters.contexts);
  },
  component: ({ adapters: { contexts } }: { adapters: InspectorAdapters }) => {
    if (!contexts) {
      return null;
    }

    return <ProfilesInspectorViewComponent contextsAdapter={contexts} />;
  },
});
