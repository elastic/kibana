/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  euiAnimFadeIn,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 } from 'uuid';
import {
  getJourneyFlyoutChildStyles,
  getJourneyFlyoutParentStyles,
  getZIndex,
  triggerAnimationOnRef,
} from './journey_flyout.styles';
import { JourneyFlyoutApi, JourneyFlyoutEntry, JourneyFlyoutProps } from './types';

interface JourneyFlyoutEntryState extends JourneyFlyoutEntry {
  ActiveChild?: React.FC<JourneyFlyoutProps>;
}

export const JourneyFlyout = forwardRef<JourneyFlyoutApi>(({}, ref) => {
  const { euiTheme } = useEuiTheme();
  const { journeyFlyoutParentStyles, journeyFlyoutChildStyles } = useMemo(
    () => ({
      journeyFlyoutParentStyles: getJourneyFlyoutParentStyles(euiTheme),
      journeyFlyoutChildStyles: getJourneyFlyoutChildStyles(euiTheme),
    }),
    [euiTheme]
  );

  const flyoutsMap = useRef<{ [key: string]: JourneyFlyoutEntryState }>({});
  const flyoutEntries = useRef<JourneyFlyoutEntryState[]>([]);

  const [historyCount, setHistoryCount] = useState(0);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);

  const [aIndex, setAIndex] = useState<number | undefined>(undefined);
  const [bIndex, setBIndex] = useState<number | undefined>(undefined);

  const [isAActive, setIsAActive] = useState(true);
  const activeIndex = useMemo(() => (isAActive ? aIndex : bIndex), [aIndex, bIndex, isAActive]);

  const [hasChildFlyout, setHasChildFlyout] = useState(false);
  const [childId, setChildId] = useState<string>();

  useEffect(() => {
    setHasChildFlyout(Boolean(flyoutEntries.current[activeIndex ?? -1]?.ActiveChild));
  }, [activeIndex]);

  const resetFlyoutState = useCallback(() => {
    setIsFlyoutOpen(false);
    setAIndex(undefined);
    setBIndex(undefined);
    flyoutEntries.current = [];
    flyoutsMap.current = {};
    setIsAActive(true);
    setHistoryCount(0);
  }, []);

  useImperativeHandle(ref, () => ({
    // send back an imperative method that opens the INITIAL flyout
    openFlyout: (flyoutEntry) => {
      flyoutEntries.current[0] = flyoutEntry;
      setIsFlyoutOpen(true);
      setAIndex(0);
      setHistoryCount(1);
    },
  }));

  const openNextFlyout: JourneyFlyoutProps['openNextFlyout'] = useCallback(
    (flyoutEntry) => {
      if (isAnimating) return;
      flyoutEntries.current.push(flyoutEntry);
      setHistoryCount((prev) => prev + 1);

      // close child flyout
      const activeFlyout = flyoutEntries?.current[activeIndex ?? -1];
      if (activeFlyout?.ActiveChild) activeFlyout.ActiveChild = undefined;

      // use the currently inactive flyout as the next active flyout.
      const setIndexForNextActiveFlyout = isAActive ? setBIndex : setAIndex;
      setIndexForNextActiveFlyout(flyoutEntries.current.length - 1);
      setIsAActive(!isAActive);
      setIsAnimating(true);

      // animate the next flyout in and set it active
      const flyoutRef = isAActive ? bRef : aRef;
      triggerAnimationOnRef(flyoutRef.current, 'slide-in').then(() => {
        setIsAnimating(false);
        // stop rendering the inactive flyout
        (isAActive ? setAIndex : setBIndex)(undefined);
      });
    },
    [activeIndex, isAActive, isAnimating]
  );

  const openLastFlyout = useCallback(() => {
    if (isAnimating) return;
    // set the index of the inactive flyout, but don't make it active yet.
    const flyoutIndexSetter = isAActive ? setBIndex : setAIndex;
    flyoutIndexSetter(flyoutEntries.current.length - 2);
    setHistoryCount((prev) => prev - 1);

    // slide the currently active flyout out of frame. Then make the inactive flyout active.
    const flyoutRef = isAActive ? aRef : bRef;
    setIsAnimating(true);
    triggerAnimationOnRef(flyoutRef.current, 'slide-out').then(() => {
      setIsAActive(!isAActive);
      // then delete the last flyout entry.
      flyoutEntries.current = flyoutEntries.current.slice(0, -1);
      setIsAnimating(false);
    });
  }, [isAActive, isAnimating]);

  const openChildFlyout: JourneyFlyoutProps['openChildFlyout'] = useCallback(
    ({ Component }) => {
      const activeFlyout = flyoutEntries?.current[activeIndex ?? -1];
      if (!activeFlyout) return;
      activeFlyout.ActiveChild = Component;
      setHasChildFlyout(true);
      setChildId(v4());
    },
    [activeIndex]
  );

  const { ComponentA, ComponentB, CurrentChildComponent } = useMemo(() => {
    return {
      ComponentA: flyoutEntries?.current[aIndex ?? -1]?.Component,
      ComponentB: flyoutEntries?.current[bIndex ?? -1]?.Component,
      CurrentChildComponent:
        hasChildFlyout && childId ? flyoutEntries?.current[activeIndex ?? -1]?.ActiveChild : null,
    };
  }, [aIndex, bIndex, activeIndex, hasChildFlyout, childId]);

  if (!isFlyoutOpen) return null;
  console.log('rendering with child ID,', childId);
  return (
    <>
      <JourneyFlyoutFade />
      <div
        key={childId}
        css={css`
          right: ${hasChildFlyout ? '800px' : '0'};
          ${journeyFlyoutChildStyles}
        `}
      >
        <div className="journey-flyout-toolbar">
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                onClick={() => {
                  setHasChildFlyout(false);
                  flyoutEntries.current[activeIndex ?? -1].ActiveChild = undefined;
                }}
                aria-label="Close journey flyout"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          {CurrentChildComponent && (
            <CurrentChildComponent
              openNextFlyout={openNextFlyout}
              openChildFlyout={openChildFlyout}
            />
          )}
        </div>
      </div>
      <div css={journeyFlyoutParentStyles}>
        <div className="journey-flyout-toolbar">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {historyCount > 1 && (
                <EuiButtonEmpty
                  size="xs"
                  iconType="clockCounter"
                  iconSide="left"
                  onClick={openLastFlyout}
                >
                  Back
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                onClick={resetFlyoutState}
                aria-label="Close journey flyout"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div className="journey-flyout-content-container">
          <div ref={aRef} className="journey-flyout-content" css={getZIndex(isAActive)}>
            {ComponentA && (
              <ComponentA openNextFlyout={openNextFlyout} openChildFlyout={openChildFlyout} />
            )}
          </div>
          <div className="journey-flyout-shadow" />
          <div ref={bRef} className="journey-flyout-content" css={getZIndex(!isAActive)}>
            {ComponentB && (
              <ComponentB openNextFlyout={openNextFlyout} openChildFlyout={openChildFlyout} />
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export const JourneyFlyoutFade = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className="journey-flyout-fade"
      css={css`
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        position: fixed;
        z-index: ${euiTheme.levels.maskBelowHeader};
        animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
        background-color: ${transparentize(euiTheme.colors.plainDark, 0.5)};
      `}
    />
  );
};
