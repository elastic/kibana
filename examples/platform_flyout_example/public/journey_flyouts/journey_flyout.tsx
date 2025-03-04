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
  ActiveChild?: JourneyFlyoutEntry;
}

export const JourneyFlyout = forwardRef<JourneyFlyoutApi, { childBackgroundColor?: string }>(
  ({ childBackgroundColor }, ref) => {
    const { euiTheme } = useEuiTheme();
    const [width, setWidth] = useState(800);
    const [childWidth, setChildWidth] = useState(800);

    const componentsMap = useRef<{ [key: string]: JourneyFlyoutEntryState }>({});
    const [historyEntries, setHistoryEntries] = useState<string[]>([]);

    const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const aRef = useRef<HTMLDivElement>(null);
    const bRef = useRef<HTMLDivElement>(null);

    const [aIndex, setAIndex] = useState<number | undefined>(undefined);
    const componentAId = useMemo(() => historyEntries[aIndex ?? -1], [aIndex, historyEntries]);
    const [bIndex, setBIndex] = useState<number | undefined>(undefined);
    const componentBId = useMemo(() => historyEntries[bIndex ?? -1], [bIndex, historyEntries]);

    const [isAActive, setIsAActive] = useState(true);
    const activeIndex = useMemo(() => (isAActive ? aIndex : bIndex), [aIndex, bIndex, isAActive]);

    const [hasChildFlyout, setHasChildFlyout] = useState(false);
    const [childId, setChildId] = useState<string>();

    const { journeyFlyoutParentStyles, journeyFlyoutChildStyles } = useMemo(
      () => ({
        journeyFlyoutParentStyles: getJourneyFlyoutParentStyles(euiTheme, width),
        journeyFlyoutChildStyles: getJourneyFlyoutChildStyles(
          euiTheme,
          hasChildFlyout ? childWidth : Math.min(childWidth, width),
          childBackgroundColor
        ),
      }),
      [euiTheme, width, hasChildFlyout, childWidth, childBackgroundColor]
    );

    useEffect(() => {
      setHasChildFlyout(
        Boolean(componentsMap.current[isAActive ? componentAId : componentBId]?.ActiveChild)
      );
    }, [activeIndex, componentAId, componentBId, isAActive]);

    const resetFlyoutState = useCallback(() => {
      setIsFlyoutOpen(false);
      setAIndex(undefined);
      setBIndex(undefined);
      componentsMap.current = {};
      setHistoryEntries([]);
      setIsAActive(true);
    }, []);

    useImperativeHandle(ref, () => ({
      // send back an imperative method that opens the INITIAL flyout
      openFlyout: (flyoutEntry) => {
        const flyoutId = v4();
        setHistoryEntries([flyoutId]);
        setWidth(flyoutEntry.width);
        componentsMap.current[flyoutId] = flyoutEntry;
        setIsFlyoutOpen(true);
        setAIndex(0);
      },
    }));

    const openNextFlyout: JourneyFlyoutProps['openNextFlyout'] = useCallback(
      (flyoutEntry) => {
        if (isAnimating || activeIndex === undefined) return;
        const flyoutId = v4();
        componentsMap.current[flyoutId] = flyoutEntry;
        const nextHistoryEntries = historyEntries.slice(0, activeIndex + 1);
        nextHistoryEntries.push(flyoutId);
        setHistoryEntries(nextHistoryEntries);

        // use the currently inactive flyout as the next active flyout.
        const setIndexForNextActiveFlyout = isAActive ? setBIndex : setAIndex;
        setIndexForNextActiveFlyout(nextHistoryEntries.length - 1);
        setIsAActive(!isAActive);
        setIsAnimating(true);
        setWidth(flyoutEntry.width);

        // animate the next flyout in and set it active
        const flyoutRef = isAActive ? bRef : aRef;
        triggerAnimationOnRef(flyoutRef.current, 'slide-in').then(() => {
          setIsAnimating(false);
          // stop rendering the inactive flyout
          // (isAActive ? setAIndex : setBIndex)(undefined);
        });
      },
      [activeIndex, historyEntries, isAActive, isAnimating]
    );

    const goBack = useCallback(() => {
      if (isAnimating || !activeIndex) return;
      // set the index of the inactive flyout, but don't make it active yet.
      const flyoutIndexSetter = isAActive ? setBIndex : setAIndex;
      flyoutIndexSetter(activeIndex - 1);
      // slide the currently active flyout out of frame. Then make the inactive flyout active.
      const flyoutRef = isAActive ? aRef : bRef;
      setIsAnimating(true);
      const flyoutEntry = componentsMap.current[historyEntries[activeIndex - 1]];
      setWidth(flyoutEntry.width);
      setChildWidth(flyoutEntry.ActiveChild?.width ?? width);
      triggerAnimationOnRef(flyoutRef.current, 'slide-out').then(() => {
        setIsAActive(!isAActive);
        // then delete the last flyout entry.
        setIsAnimating(false);
      });
    }, [activeIndex, historyEntries, isAActive, isAnimating, width]);

    const goForward = useCallback(() => {
      if (isAnimating || activeIndex === undefined) return;

      // use the currently inactive flyout as the next active flyout.
      const setIndexForNextActiveFlyout = isAActive ? setBIndex : setAIndex;
      setIndexForNextActiveFlyout(activeIndex + 1);
      const flyoutEntry = componentsMap.current[historyEntries[activeIndex + 1]];
      setWidth(flyoutEntry.width);
      setChildWidth(flyoutEntry.ActiveChild?.width ?? width);
      setIsAActive(!isAActive);
      setIsAnimating(true);

      // animate the next flyout in and set it active
      const flyoutRef = isAActive ? bRef : aRef;
      triggerAnimationOnRef(flyoutRef.current, 'slide-in').then(() => {
        setIsAnimating(false);
        // stop rendering the inactive flyout
        // (isAActive ? setAIndex : setBIndex)(undefined);
      });
    }, [activeIndex, historyEntries, isAActive, isAnimating, width]);

    const openChildFlyout: JourneyFlyoutProps['openChildFlyout'] = useCallback(
      ({ Component, width: nextChildWidth }) => {
        if (activeIndex === undefined) return;
        const activeFlyout = componentsMap?.current[historyEntries[activeIndex]];
        if (!activeFlyout) return;
        activeFlyout.ActiveChild = { Component, width: nextChildWidth };
        setHasChildFlyout(true);
        setChildWidth(nextChildWidth);
        setChildId(v4());
      },
      [activeIndex, historyEntries]
    );

    const { ComponentA, ComponentB, CurrentChildComponent } = useMemo(() => {
      return {
        ComponentA: componentsMap?.current[componentAId]?.Component,
        ComponentB: componentsMap?.current[componentBId]?.Component,
        CurrentChildComponent:
          hasChildFlyout && childId
            ? componentsMap?.current[isAActive ? componentAId : componentBId]?.ActiveChild
                ?.Component
            : null,
      };
    }, [componentAId, componentBId, hasChildFlyout, childId, isAActive]);

    if (!isFlyoutOpen) return null;
    return (
      <>
        <JourneyFlyoutFade />
        <div
          css={css`
            right: ${hasChildFlyout ? `${width}px` : '0'};
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
                    delete componentsMap?.current[isAActive ? componentAId : componentBId]
                      .ActiveChild;
                  }}
                  aria-label="Close journey flyout"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
          <div
            key={childId}
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
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    {historyEntries.length > 1 && (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="arrowLeft"
                        iconSide="left"
                        onClick={goBack}
                        disabled={activeIndex === 0}
                      >
                        Back
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {historyEntries.length > 1 && (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="arrowRight"
                        iconSide="right"
                        onClick={goForward}
                        disabled={activeIndex === historyEntries.length - 1}
                      >
                        Forward
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
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
  }
);

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
