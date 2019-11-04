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

import React, { useEffect, useState } from 'react';
import { SnackbarProvider } from 'notistack';
import { makeStyles } from '@material-ui/core/styles';
import { AuthContext, AuthContextValue } from '@logrhythm/nm-web-shared/contexts/auth_context';
import {
  BlockingProcessContext,
  BlockingProcessContextState,
} from '@logrhythm/nm-web-shared/contexts/blocking_process_context';
import BlockingProcessModal from '@logrhythm/nm-web-shared/components/blocking_process/blocking_process_modal';
import { Navbar } from '@logrhythm/nm-web-shared/components/navigation/navbar/navbar';
import Auth from '@logrhythm/nm-web-shared/services/auth';
import { useSessionSync } from '@logrhythm/nm-web-shared/hooks/session_sync_hooks';
import NotificationHandler from './notification_handler';

const useStyles = makeStyles(
  {
    snackbar: {
      maxWidth: '20vw',
      '& > div': {
        borderRadius: 0,
        font: '400 100%/1.4 Ubuntu,Tahoma,sans-serif',
        flexWrap: 'nowrap',
      },
      '& > div > div:first-child': {
        width: '100%',
      },
      '& a': {
        textDecoration: 'underline !important',
      },
    },
  },
  { name: 'Navbar' }
);

const LogRhythmNavbar = () => {
  const classes = useStyles();

  const [authState, setAuthState] = useState<AuthContextValue>(undefined);

  const checkingToken = useSessionSync('token');
  const checkingNotifications = useSessionSync('notificationsAlreadySeen');

  const [blockingProcessMsg, setBlockingProcessMsg] = useState<string>('');
  const blockingProcessContextState: BlockingProcessContextState = {
    message: blockingProcessMsg,
    block: setBlockingProcessMsg,
    unblock: () => setBlockingProcessMsg(''),
  };

  useEffect(
    () => {
      if (checkingToken || checkingNotifications) {
        return;
      }

      const unsub = Auth.subscribe(setAuthState);

      Auth.getCurrentUser();

      return unsub;
    },
    [checkingToken, checkingNotifications]
  );

  if (authState === undefined) {
    return null;
  }

  return (
    <AuthContext.Provider value={[authState, setAuthState]}>
      <BlockingProcessContext.Provider value={blockingProcessContextState}>
        <SnackbarProvider
          maxSnack={7}
          classes={{ root: classes.snackbar }}
          autoHideDuration={3000}
          hideIconVariant={true}
        >
          <Navbar />
          <NotificationHandler />
          <BlockingProcessModal />
        </SnackbarProvider>
      </BlockingProcessContext.Provider>
    </AuthContext.Provider>
  );
};

export default LogRhythmNavbar; // eslint-disable-line
