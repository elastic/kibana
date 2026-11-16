/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { ChromeHeaderLogo } from './header_logo';
import { SearchButton } from '../shared/search_button';
import { AiButtonSlot } from '../shared/ai_button_slot';
import { HelpButton } from '../shared/help_button';
import { ChromeHeaderShell } from './header_shell';
import {
  useContextSwitcher,
  useProjectPicker,
  useSubscriptionBadge,
  useUserMenu,
  useUserMenuAction,
} from '../shared/chrome_hooks';
import { ChromeHeaderPageAnnouncer } from '../shared/header_page_announcer';

const PROPOSAL_STORAGE_KEY = 'kbn.contextSwitcherProposal';
const PROPOSAL_CHANGE_EVENT = 'kbn.contextSwitcherProposalChange';
const TRIAL_BADGE_STORAGE_KEY = 'kbn.contextSwitcherTrialBadge';
const TRIAL_BADGE_CHANGE_EVENT = 'kbn.contextSwitcherTrialBadgeChange';

const readContextSwitcherProposal = (): string | null => {
  try {
    return sessionStorage.getItem(PROPOSAL_STORAGE_KEY);
  } catch {
    return null;
  }
};

const readTrialBadge = (): boolean => {
  try {
    return sessionStorage.getItem(TRIAL_BADGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Proposal preview. The header subscription badge is the original menu's trial badge.
 * Proposal 1 and 2 render the badge inside their own popovers.
 */
const useShowSubscriptionBadge = (): boolean => {
  const [proposal, setProposal] = useState(readContextSwitcherProposal);
  const [trialBadge, setTrialBadge] = useState(readTrialBadge);

  useEffect(() => {
    const onProposal = (event: Event) => {
      setProposal((event as CustomEvent<string>).detail);
    };
    const onTrialBadge = (event: Event) => {
      setTrialBadge((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(PROPOSAL_CHANGE_EVENT, onProposal);
    window.addEventListener(TRIAL_BADGE_CHANGE_EVENT, onTrialBadge);
    return () => {
      window.removeEventListener(PROPOSAL_CHANGE_EVENT, onProposal);
      window.removeEventListener(TRIAL_BADGE_CHANGE_EVENT, onTrialBadge);
    };
  }, []);

  return trialBadge && proposal === 'original';
};

export const ChromeHeader = React.memo(() => {
  const subscriptionBadge = useSubscriptionBadge();
  const showSubscriptionBadge = useShowSubscriptionBadge();

  return (
    <>
      <ChromeHeaderPageAnnouncer />
      <ChromeHeaderShell
        logo={<ChromeHeaderLogo />}
        search={<SearchButton />}
        actions={<AiButtonSlot />}
        help={<HelpButton />}
        switcher={useContextSwitcher()}
        projectPicker={useProjectPicker()}
        subscriptionBadge={showSubscriptionBadge ? subscriptionBadge : null}
        userMenuAction={useUserMenuAction()}
        userMenu={useUserMenu()}
      />
    </>
  );
});

ChromeHeader.displayName = 'ChromeHeader';
