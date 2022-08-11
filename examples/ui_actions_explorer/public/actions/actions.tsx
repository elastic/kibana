/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { OverlayStart } from '@kbn/core/public';
import { EuiFieldText, EuiModalBody, EuiButton } from '@elastic/eui';
import { useState } from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  ActionExecutionContext,
  createAction,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';

export const USER_TRIGGER = 'USER_TRIGGER';
export const COUNTRY_TRIGGER = 'COUNTRY_TRIGGER';
export const PHONE_TRIGGER = 'PHONE_TRIGGER';

export const ACTION_VIEW_IN_MAPS = 'ACTION_VIEW_IN_MAPS';
export const ACTION_TRAVEL_GUIDE = 'ACTION_TRAVEL_GUIDE';
export const ACTION_CALL_PHONE_NUMBER = 'ACTION_CALL_PHONE_NUMBER';
export const ACTION_EDIT_USER = 'ACTION_EDIT_USER';
export const ACTION_TRIGGER_PHONE_USER = 'ACTION_TRIGGER_PHONE_USER';
export const ACTION_SHOWCASE_PLUGGABILITY = 'ACTION_SHOWCASE_PLUGGABILITY';

export const showcasePluggability = createAction({
  id: ACTION_SHOWCASE_PLUGGABILITY,
  type: ACTION_SHOWCASE_PLUGGABILITY,
  getDisplayName: () => 'This is pluggable! Any plugin can inject their actions here.',
  execute: async (context: ActionExecutionContext) =>
    alert(`Isn't that cool?! Triggered by ${context.trigger?.id} trigger`),
});

export interface PhoneContext {
  phone: string;
}

export const makePhoneCallAction = createAction<PhoneContext>({
  id: ACTION_CALL_PHONE_NUMBER,
  type: ACTION_CALL_PHONE_NUMBER,
  getDisplayName: () => 'Call phone number',
  execute: async (context) => alert(`Pretend calling ${context.phone}...`),
});

export const lookUpWeatherAction = createAction<CountryContext>({
  id: ACTION_TRAVEL_GUIDE,
  type: ACTION_TRAVEL_GUIDE,
  getIconType: () => 'popout',
  getDisplayName: () => 'View travel guide',
  execute: async (context) => {
    window.open(`https://www.worldtravelguide.net/?s=${context.country}`, '_blank');
  },
});

export interface CountryContext {
  country: string;
}

export const viewInMapsAction = createAction<CountryContext>({
  id: ACTION_VIEW_IN_MAPS,
  type: ACTION_VIEW_IN_MAPS,
  getIconType: () => 'popout',
  getDisplayName: () => 'View in maps',
  execute: async (context) => {
    window.open(`https://www.google.com/maps/place/${context.country}`, '_blank');
  },
});

export interface User {
  phone?: string;
  countryOfResidence: string;
  name: string;
}

function EditUserModal({
  user,
  update,
  close,
}: {
  user: User;
  update: (user: User) => void;
  close: () => void;
}) {
  const [name, setName] = useState(user.name);
  return (
    <EuiModalBody>
      <EuiFieldText prepend="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <EuiButton
        onClick={() => {
          update({ ...user, name });
          close();
        }}
      >
        Update
      </EuiButton>
    </EuiModalBody>
  );
}

export const createEditUserAction = (getOpenModal: () => Promise<OverlayStart['openModal']>) =>
  createAction<UserContext>({
    id: ACTION_EDIT_USER,
    type: ACTION_EDIT_USER,
    getIconType: () => 'pencil',
    getDisplayName: () => 'Edit user',
    execute: async ({ user, update }) => {
      const overlay = (await getOpenModal())(
        toMountPoint(<EditUserModal user={user} update={update} close={() => overlay.close()} />)
      );
    },
  });

export interface UserContext {
  user: User;
  update: (user: User) => void;
}

export const createTriggerPhoneTriggerAction = (getUiActionsApi: () => Promise<UiActionsStart>) =>
  createAction<UserContext>({
    id: ACTION_TRIGGER_PHONE_USER,
    type: ACTION_TRIGGER_PHONE_USER,
    getDisplayName: () => 'Call phone number',
    shouldAutoExecute: async () => true,
    isCompatible: async ({ user }) => user.phone !== undefined,
    execute: async ({ user }) => {
      if (user.phone !== undefined) {
        (await getUiActionsApi()).executeTriggerActions(PHONE_TRIGGER, { phone: user.phone });
      }
    },
  });
