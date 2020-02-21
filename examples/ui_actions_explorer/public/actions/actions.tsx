/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { OverlayStart } from 'kibana/public';
import { EuiFieldText, EuiModalBody, EuiButton } from '@elastic/eui';
import { useState } from 'react';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { createAction, UiActionsStart } from '../../../../src/plugins/ui_actions/public';

export const USER_TRIGGER = 'USER_TRIGGER';
export const COUNTRY_TRIGGER = 'COUNTRY_TRIGGER';
export const PHONE_TRIGGER = 'PHONE_TRIGGER';

export const VIEW_IN_MAPS_ACTION = 'VIEW_IN_MAPS_ACTION';
export const TRAVEL_GUIDE_ACTION = 'TRAVEL_GUIDE_ACTION';
export const CALL_PHONE_NUMBER_ACTION = 'CALL_PHONE_NUMBER_ACTION';
export const EDIT_USER_ACTION = 'EDIT_USER_ACTION';
export const PHONE_USER_ACTION = 'PHONE_USER_ACTION';
export const SHOWCASE_PLUGGABILITY_ACTION = 'SHOWCASE_PLUGGABILITY_ACTION';

export const showcasePluggability = createAction<{}>({
  type: SHOWCASE_PLUGGABILITY_ACTION,
  getDisplayName: () => 'This is pluggable! Any plugin can inject their actions here.',
  execute: async ({}) => alert("Isn't that cool?!"),
});

export const makePhoneCallAction = createAction<{ phone: string }>({
  type: CALL_PHONE_NUMBER_ACTION,
  getDisplayName: () => 'Call phone number',
  execute: async ({ phone }) => alert(`Pretend calling ${phone}...`),
});

export const lookUpWeatherAction = createAction<{ country: string }>({
  type: TRAVEL_GUIDE_ACTION,
  getIconType: () => 'popout',
  getDisplayName: () => 'View travel guide',
  execute: async ({ country }) => {
    window.open(`https://www.worldtravelguide.net/?s=${country},`, '_blank');
  },
});

export const viewInMapsAction = createAction<{ country: string }>({
  type: VIEW_IN_MAPS_ACTION,
  getIconType: () => 'popout',
  getDisplayName: () => 'View in maps',
  execute: async ({ country }) => {
    window.open(`https://www.google.com/maps/place/${country}`, '_blank');
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
      <EuiFieldText prepend="Name" value={name} onChange={e => setName(e.target.value)} />
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
  createAction<{
    user: User;
    update: (user: User) => void;
  }>({
    type: EDIT_USER_ACTION,
    getIconType: () => 'pencil',
    getDisplayName: () => 'Edit user',
    execute: async ({ user, update }) => {
      const overlay = (await getOpenModal())(
        toMountPoint(<EditUserModal user={user} update={update} close={() => overlay.close()} />)
      );
    },
  });

export const createPhoneUserAction = (getUiActionsApi: () => Promise<UiActionsStart>) =>
  createAction<{
    user: User;
    update: (user: User) => void;
  }>({
    type: PHONE_USER_ACTION,
    getDisplayName: () => 'Call phone number',
    isCompatible: async ({ user }) => user.phone !== undefined,
    execute: async ({ user }) => {
      // One option - execute the more specific action directly.
      // makePhoneCallAction.execute({ phone: user.phone });

      // Another option - emit the trigger and automatically get *all* the actions attached
      // to the phone number trigger.
      // TODO: we need to figure out the best way to handle these nested actions however, since
      // we don't want multiple context menu's to pop up.
      (await getUiActionsApi()).executeTriggerActions(PHONE_TRIGGER, { phone: user.phone });
    },
  });
