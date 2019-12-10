/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
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
