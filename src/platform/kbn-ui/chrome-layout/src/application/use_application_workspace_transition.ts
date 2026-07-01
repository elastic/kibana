/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';

import type {
  ApplicationWorkspaceRect,
  ApplicationWorkspaceTransitionPhase,
} from './application_workspace_transition_phase';
import {
  domRectToApplicationWorkspaceRect,
  resolveApplicationWorkspaceTransitionPhase,
} from './application_workspace_transition_phase';
import { PANEL_LAYOUT_TRANSITION_MS } from '../panel_layout_transition';

interface ApplicationWorkspaceDecoyState {
  phase: 'closing' | 'opening';
  rect: ApplicationWorkspaceRect;
}

export const useApplicationWorkspaceTransition = ({
  canAnimate,
  applicationWorkspaceOpen,
}: {
  canAnimate: boolean;
  applicationWorkspaceOpen: boolean;
}) => {
  const [heldTransitionPhase, setHeldTransitionPhase] =
    useState<ApplicationWorkspaceTransitionPhase>('none');
  const [decoy, setDecoy] = useState<ApplicationWorkspaceDecoyState | null>(null);

  const prevApplicationWorkspaceOpenRef = useRef(applicationWorkspaceOpen);
  const pendingClosingDecoyRef = useRef<ApplicationWorkspaceDecoyState | null>(null);

  const prevApplicationWorkspaceOpen = prevApplicationWorkspaceOpenRef.current;

  const applicationWorkspaceTransitionPhase = resolveApplicationWorkspaceTransitionPhase({
    canAnimate,
    applicationWorkspaceOpen,
    prevApplicationWorkspaceOpen,
    heldPhase: heldTransitionPhase,
  });

  if (
    prevApplicationWorkspaceOpen &&
    !applicationWorkspaceOpen &&
    canAnimate &&
    applicationWorkspaceTransitionPhase === 'closing' &&
    pendingClosingDecoyRef.current === null &&
    decoy === null
  ) {
    const applicationPanel = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
    if (applicationPanel) {
      const domRect = applicationPanel.getBoundingClientRect();
      if (domRect.width > 0 && domRect.height > 0) {
        pendingClosingDecoyRef.current = {
          phase: 'closing',
          rect: domRectToApplicationWorkspaceRect(domRect),
        };
      }
    }
  }

  prevApplicationWorkspaceOpenRef.current = applicationWorkspaceOpen;

  const finishTransition = useCallback(() => {
    setHeldTransitionPhase('none');
  }, []);

  const handleDecoyComplete = useCallback(() => {
    finishTransition();
    setDecoy(null);
  }, [finishTransition]);

  useLayoutEffect(() => {
    if (
      applicationWorkspaceTransitionPhase === 'opening' ||
      applicationWorkspaceTransitionPhase === 'closing'
    ) {
      setHeldTransitionPhase(applicationWorkspaceTransitionPhase);
    } else if (!canAnimate) {
      setHeldTransitionPhase('none');
    }
  }, [applicationWorkspaceTransitionPhase, canAnimate]);

  useLayoutEffect(() => {
    if (pendingClosingDecoyRef.current) {
      setDecoy(pendingClosingDecoyRef.current);
      pendingClosingDecoyRef.current = null;
      return;
    }

    if (
      applicationWorkspaceTransitionPhase === 'closing' &&
      !applicationWorkspaceOpen &&
      canAnimate &&
      decoy === null
    ) {
      finishTransition();
    }
  }, [
    applicationWorkspaceOpen,
    applicationWorkspaceTransitionPhase,
    canAnimate,
    decoy,
    finishTransition,
  ]);

  // Opening uses real panel width animation (no decoy). Hold the phase for the tween duration.
  useLayoutEffect(() => {
    if (applicationWorkspaceTransitionPhase !== 'opening' || !canAnimate) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      finishTransition();
    }, PANEL_LAYOUT_TRANSITION_MS + 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [applicationWorkspaceTransitionPhase, canAnimate, finishTransition]);

  return {
    applicationWorkspaceTransitionPhase,
    decoy,
    handleDecoyComplete,
  };
};
