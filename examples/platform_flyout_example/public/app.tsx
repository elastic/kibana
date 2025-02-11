/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPageHeader,
  EuiPageSection,
  EuiText,
  euiAnimFadeIn,
  euiFlyoutSlideInRight,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { SerializedStyles, css, keyframes } from '@emotion/react';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import { StartDeps } from './plugin';

interface PlatformFlyoutEntry {
  Component: React.FC<PlatformFlyoutApi>;
}

interface PlatformFlyoutApi {
  openFlyout: (props: PlatformFlyoutEntry) => void;
}

const FlyoutOne: React.FC<PlatformFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout one</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutTwo })}>Open flyout 2</EuiButton>
    </EuiText>
  );
};

const FlyoutTwo: React.FC<PlatformFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout two</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutThree })}>Go to flyout 3</EuiButton>
    </EuiText>
  );
};

const FlyoutThree: React.FC<PlatformFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout three</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutFour })}>
        Wanna see flyout four?
      </EuiButton>
    </EuiText>
  );
};

const FlyoutFour: React.FC<PlatformFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout four</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutFive })}>
        Checkout flyout five
      </EuiButton>
    </EuiText>
  );
};

const FlyoutFive: React.FC<PlatformFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout Five</h2>
      <EuiText> Welcome to flyout 5!</EuiText>
    </EuiText>
  );
};

export const flyoutSlideOutRight = keyframes`
  0% {
    opacity: 1;
    transform: translateX(0%);
  }
  75% {
    opacity: 0;
    transform: translateX(100%);
  }
`;

const App = ({
  core,
  deps,
  mountParams,
}: {
  core: CoreStart;
  deps: StartDeps;
  mountParams: AppMountParameters;
}) => {
  const flyoutApi = useRef<PlatformFlyoutApi | null>(null);

  return (
    <KibanaRenderContextProvider {...core}>
      <EuiPageHeader
        paddingSize="l"
        restrictWidth={true}
        bottomBorder="extended"
        pageTitle="Platform flyout example"
        description="In progress..."
      />
      <EuiPageSection restrictWidth={true} alignment={'top'} color={'plain'} grow={true}>
        <EuiButton onClick={() => flyoutApi.current?.openFlyout({ Component: FlyoutOne })}>
          Open flyout
        </EuiButton>
        <PlatformFlyout ref={flyoutApi} />
      </EuiPageSection>
    </KibanaRenderContextProvider>
  );
};

const fixedHeaderOffset = `var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0))`;
const slideAnimationLength = 250;

const PlatformFlyout = forwardRef<PlatformFlyoutApi>(({}, ref) => {
  const { euiTheme } = useEuiTheme();
  const FlyoutComponents = useRef<PlatformFlyoutEntry[]>([]);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);

  const [topFlyout, setTopFlyout] = useState<1 | 2>(1);
  const [flyoutOneIndex, setFlyoutOneIndex] = useState<number | undefined>(undefined);
  const [flyoutTwoIndex, setFlyoutTwoIndex] = useState<number | undefined>(undefined);
  const [flyoutOneAnimation, setFlyoutOneAnimation] = useState<SerializedStyles | undefined>();
  const [flyoutTwoAnimation, setFlyoutTwoAnimation] = useState<SerializedStyles | undefined>();
  const [flyoutFadeAnimation, setFlyoutFadeAnimation] = useState<SerializedStyles | undefined>(css`
    opacity: 0;
    transition: opacity ${euiTheme.animation.slow} ease-in;
  `);

  const currentFlyoutIndex = useMemo(
    () => (topFlyout === 1 ? flyoutOneIndex : flyoutTwoIndex) ?? -1,
    [flyoutOneIndex, flyoutTwoIndex, topFlyout]
  );

  const FlyoutOneComponent = FlyoutComponents.current[flyoutOneIndex ?? -1]?.Component ?? null;
  const FlyoutTwoComponent = FlyoutComponents.current[flyoutTwoIndex ?? -1]?.Component ?? null;

  const setFlyoutIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex === currentFlyoutIndex) return;

      setTransitionActive(true);

      const flyoutIndexSetter = topFlyout === 1 ? setFlyoutTwoIndex : setFlyoutOneIndex;
      const direction = nextIndex > currentFlyoutIndex ? 'forward' : 'back';

      const topFlyoutAnimationSetter =
        topFlyout === 1 ? setFlyoutOneAnimation : setFlyoutTwoAnimation;
      const bottomFlyoutAnimationSetter =
        topFlyout === 1 ? setFlyoutTwoAnimation : setFlyoutOneAnimation;

      flyoutIndexSetter(nextIndex);
      if (direction === 'forward') {
        setTopFlyout(topFlyout === 1 ? 2 : 1);
        setFlyoutFadeAnimation(css`
          opacity: 1;
          transition: opacity ${euiTheme.animation.slow} ease-in;
        `);
        bottomFlyoutAnimationSetter(css`
          left: 100%;
        `);
        setTimeout(() => {
          bottomFlyoutAnimationSetter(css`
            left: 0;
            transition: left ${slideAnimationLength}ms;
          `);
        }, 0);
        setTimeout(() => {
          setFlyoutFadeAnimation(css`
            opacity: 0;
          `);
          setTransitionActive(false);
        }, slideAnimationLength);
      } else {
        setFlyoutFadeAnimation(css`
          opacity: 0.5;
        `);
        topFlyoutAnimationSetter(css`
          left: 0;
        `);
        bottomFlyoutAnimationSetter(css`
          left: 0;
        `);
        setTimeout(() => {
          setFlyoutFadeAnimation(css`
            opacity: 0;
            transition: opacity ${euiTheme.animation.slow} ease-out;
          `);
          topFlyoutAnimationSetter(css`
            left: 100%;
            transition: left ${slideAnimationLength}ms;
          `);
        }, 0);
        setTimeout(() => {
          setTopFlyout((currentTopFlyout) => (currentTopFlyout === 1 ? 2 : 1));
          setTransitionActive(false);
        }, slideAnimationLength);
      }
    },
    [currentFlyoutIndex, euiTheme.animation.slow, topFlyout]
  );

  const openInitialFlyout: PlatformFlyoutApi['openFlyout'] = useCallback((flyoutEntry) => {
    FlyoutComponents.current[0] = flyoutEntry;
    setFlyoutOneIndex(0);
    setIsFlyoutOpen(true);
  }, []);

  const openNextFlyout: PlatformFlyoutApi['openFlyout'] = useCallback(
    (flyoutEntry) => {
      if (transitionActive) return;
      const flyoutComponents = FlyoutComponents.current.slice(0, currentFlyoutIndex + 1);
      flyoutComponents.push(flyoutEntry);
      FlyoutComponents.current = flyoutComponents;
      setFlyoutIndex(flyoutComponents.length - 1);
    },
    [currentFlyoutIndex, setFlyoutIndex, transitionActive]
  );

  const historyCount = useMemo(() => {
    return FlyoutComponents.current.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyoutTwoIndex, flyoutOneIndex]);

  useImperativeHandle(ref, () => ({
    openFlyout: openInitialFlyout,
  }));

  return (
    <>
      {isFlyoutOpen && (FlyoutOneComponent !== null || FlyoutTwoComponent !== null) && (
        <>
          <div
            css={css`
              position: fixed;
              top: 0%;
              left: 0;
              width: 100vw;
              height: 100vh;
              background-color: ${transparentize(euiTheme.colors.plainDark, 0.5)};
              animation: ${euiAnimFadeIn} ${euiTheme.animation.fast} ease-in;
            `}
          />
          <div
            css={css`
              position: fixed;
              display: flex;
              flex-direction: row;
              top: ${fixedHeaderOffset};
              right: 0;
              height: calc(100vh - ${fixedHeaderOffset});
              width: 800px;
              z-index: 10000;

              animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.fast} ease-out;
            `}
          >
            <div
              css={css`
                flex-grow: 1;
                display: flex;
                flex-direction: column;
              `}
            >
              <div
                css={css`
                  display: flex;
                  flex-direction: row;
                  padding: ${euiTheme.size.s};
                  border-bottom: ${euiTheme.border.thin};
                  border-left: ${euiTheme.border.thick};
                  background-color: ${euiTheme.colors.backgroundBasePlain};
                  justify-content: space-between;
                  align-items: center;
                `}
              >
                <div>
                  <EuiButtonEmpty
                    iconType="returnKey"
                    iconSide="left"
                    onClick={() => {
                      if (transitionActive) return;
                      setFlyoutIndex(currentFlyoutIndex - 1);
                    }}
                    disabled={currentFlyoutIndex === 0}
                  >
                    Back
                  </EuiButtonEmpty>
                  <EuiBadge>{historyCount}</EuiBadge>
                </div>
                <EuiButtonIcon
                  aria-label="Close flyout"
                  iconType="cross"
                  onClick={() => {
                    setIsFlyoutOpen(false);
                    setFlyoutOneIndex(undefined);
                    setFlyoutTwoIndex(undefined);
                    FlyoutComponents.current = [];
                    setTopFlyout(1);
                  }}
                />
              </div>
              <div
                css={css`
                  position: relative;
                  flex-grow: 1;
                  border-left: ${euiTheme.border.thick};
                  overflow-y: auto;
                  overflow-x: hidden;
                `}
              >
                <div
                  css={css`
                    z-index: 2;
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    pointer-events: none;
                    padding: ${euiTheme.size.s};
                    background-color: ${transparentize(euiTheme.colors.plainDark, 0.5)};
                    ${flyoutFadeAnimation}
                  `}
                />
                <div
                  css={css`
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    padding: ${euiTheme.size.s};
                    background-color: ${euiTheme.colors.backgroundBasePlain};
                    ${flyoutOneAnimation}

                    z-index: ${topFlyout === 1 ? 5 : 0};
                  `}
                >
                  {FlyoutOneComponent && <FlyoutOneComponent openFlyout={openNextFlyout} />}
                </div>
                <div
                  css={css`
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    padding: ${euiTheme.size.s};
                    background-color: ${euiTheme.colors.backgroundBasePlain};
                    ${flyoutTwoAnimation}

                    z-index: ${topFlyout === 2 ? 5 : 0};
                  `}
                >
                  {FlyoutTwoComponent && <FlyoutTwoComponent openFlyout={openNextFlyout} />}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
});

export const renderApp = (core: CoreStart, deps: StartDeps, mountParams: AppMountParameters) => {
  ReactDOM.render(<App core={core} deps={deps} mountParams={mountParams} />, mountParams.element);

  return () => ReactDOM.unmountComponentAtNode(mountParams.element);
};
