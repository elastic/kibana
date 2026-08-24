/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useBooleanUrlState } from '@kbn/shared-url-state';
import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FLYOUT_MIN_WIDTH,
  FlyoutOwnFocusSwitch,
  FlyoutTypeSwitch,
} from '../utils';
import { FlyoutDocument } from './_flyout_document';
import { MOCK_DOCUMENTS } from './demo_documents';

interface SessionFlyoutProps {
  historyKey: symbol;
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize: 's' | 'm' | 'fill';
  childMaxWidth?: number;
}

interface FlyoutFromComponentsProps {
  historyKey: symbol;
}

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, historyKey } = props;

  const [isFlyoutOpen, setIsFlyoutOpen] = useBooleanUrlState(`flyoutOpen-${title}`);
  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isChildFlyoutAOpen, setIsChildFlyoutAOpen] = useState(false);
  const [isChildFlyoutBOpen, setIsChildFlyoutBOpen] = useState(false);

  // Refs for manual focus management
  const mainTriggerRef = useRef<HTMLButtonElement>(null);
  const childTriggerARef = useRef<HTMLButtonElement>(null);
  const childTriggerBRef = useRef<HTMLButtonElement>(null);

  // Handlers for "Open" buttons

  const handleOpenMainFlyout = () => {
    setIsFlyoutOpen(true);
  };

  const handleOpenChildFlyoutA = () => {
    setIsChildFlyoutAOpen(true);
  };

  const handleOpenChildFlyoutB = () => {
    setIsChildFlyoutBOpen(true);
  };

  // Callbacks for state synchronization

  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutAOnActive = useCallback(() => {
    console.log('activate child flyout A', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutBOnActive = useCallback(() => {
    console.log('activate child flyout B', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setIsFlyoutOpen(false);

    // Return focus to main trigger button after closing main flyout
    // TODO: clean this up if EUI adds internal support for returning focus to the trigger element on close
    // https://github.com/elastic/eui/issues/9365
    setTimeout(() => {
      mainTriggerRef.current?.focus();
    }, 100);
  }, [title, setIsFlyoutOpen]);

  const handleCloseChildFlyoutA = useCallback(() => {
    console.log('close child flyout A', title); // eslint-disable-line no-console
    setIsChildFlyoutAOpen(false);

    // Return focus to child trigger button after closing child flyout A
    setTimeout(() => {
      childTriggerARef.current?.focus();
    }, 100);
  }, [title]);

  const handleCloseChildFlyoutB = useCallback(() => {
    console.log('close child flyout B', title); // eslint-disable-line no-console
    setIsChildFlyoutBOpen(false);

    // Return focus to child trigger button after closing child flyout B
    setTimeout(() => {
      childTriggerBRef.current?.focus();
    }, 100);
  }, [title]);

  // Render

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              {/* switch for flyout type (overlay vs push) */}
              <FlyoutTypeSwitch title={title} flyoutType={flyoutType} onChange={setFlyoutType} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* switch for ownFocus behavior */}
              <FlyoutOwnFocusSwitch
                title={title}
                flyoutOwnFocus={flyoutOwnFocus}
                onChange={setFlyoutOwnFocus}
                disabled={flyoutType === 'push'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiButton
              buttonRef={mainTriggerRef}
              disabled={isFlyoutOpen}
              onClick={handleOpenMainFlyout}
              data-test-subj={`openMainFlyoutComponentButton-${title}`}
            >
              Open {title}
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && (
        <EuiFlyout
          id={`mainFlyout-${title}`}
          session="start"
          historyKey={historyKey}
          aria-labelledby="sessionFlyoutTitle"
          size={mainSize}
          maxWidth={mainMaxWidth}
          minWidth={FLYOUT_MIN_WIDTH}
          resizable
          type={flyoutType}
          ownFocus={flyoutOwnFocus}
          pushAnimation={true}
          onActive={mainFlyoutOnActive}
          onClose={handleCloseFlyout}
          flyoutMenuProps={{ title }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2 id="sessionFlyoutTitle">
                Flyout with <EuiCode>EuiFlyout</EuiCode>: {title}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiDescriptionList
              type="column"
              listItems={createMainFlyoutDescriptionItems(
                flyoutType,
                flyoutOwnFocus,
                mainSize,
                mainMaxWidth,
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
            <EuiSpacer size="m" />
            <FlyoutDocument document={MOCK_DOCUMENTS[0]} />
            <EuiSpacer size="m" />
            <EuiButton
              buttonRef={childTriggerARef}
              onClick={handleOpenChildFlyoutA}
              disabled={isChildFlyoutAOpen}
              data-test-subj={`openChildFlyoutComponentAButton-${title}`}
            >
              Open child flyout A
            </EuiButton>{' '}
            <EuiButton
              buttonRef={childTriggerBRef}
              onClick={handleOpenChildFlyoutB}
              disabled={isChildFlyoutBOpen}
              data-test-subj={`openChildFlyoutComponentBButton-${title}`}
            >
              Open child flyout B
            </EuiButton>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleCloseFlyout}
                  aria-label="Close"
                  data-test-subj={`closeMainFlyoutComponentButton-${title}`}
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
      {isChildFlyoutAOpen && (
        <EuiFlyout
          id={`childFlyout-${title}-a`}
          session="inherit"
          historyKey={historyKey}
          aria-labelledby="childFlyoutATitle"
          size={childSize}
          hasChildBackground={true}
          maxWidth={childMaxWidth}
          minWidth={FLYOUT_MIN_WIDTH}
          onActive={childFlyoutAOnActive}
          onClose={handleCloseChildFlyoutA}
          flyoutMenuProps={{
            title: `${title} - Child A`,
            titleId: 'childFlyoutATitle',
          }}
        >
          <EuiFlyoutBody>
            <EuiText>
              <p>This is child flyout A.</p>
              <EuiSpacer size="m" />
            </EuiText>
            <EuiDescriptionList
              type="column"
              listItems={createChildFlyoutDescriptionItems(
                childSize,
                childMaxWidth,
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleCloseChildFlyoutA}
                  aria-label="Close"
                  data-test-subj={`closeChildFlyoutComponentAButton-${title}`}
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
      {isChildFlyoutBOpen && (
        <EuiFlyout
          id={`childFlyout-${title}-b`}
          session="inherit"
          historyKey={historyKey}
          aria-labelledby="childFlyoutBTitle"
          size={childSize}
          hasChildBackground={true}
          maxWidth={childMaxWidth}
          minWidth={FLYOUT_MIN_WIDTH}
          onActive={childFlyoutBOnActive}
          onClose={handleCloseChildFlyoutB}
          flyoutMenuProps={{
            title: `${title} - Child B`,
            titleId: 'childFlyoutBTitle',
          }}
        >
          <EuiFlyoutBody>
            <EuiText>
              <p>This is child flyout B.</p>
              <EuiSpacer size="m" />
            </EuiText>
            <EuiDescriptionList
              type="column"
              listItems={createChildFlyoutDescriptionItems(
                childSize,
                childMaxWidth,
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleCloseChildFlyoutB}
                  aria-label="Close"
                  data-test-subj={`closeChildFlyoutComponentBButton-${title}`}
                >
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
});

SessionFlyout.displayName = 'SessionFlyoutFromComponents';

export const FlyoutWithComponent: React.FC<FlyoutFromComponentsProps> = ({ historyKey }) => (
  <>
    <EuiTitle>
      <h2>
        Flyouts with <EuiCode>EuiFlyout</EuiCode>
      </h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          With <EuiCode>{'session="start"'}</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'Session J: main size = s, child size = s',
            description: (
              <SessionFlyout title="Session J" mainSize="s" childSize="s" historyKey={historyKey} />
            ),
          },
          {
            title: 'Session K: main size = m, child size = s',
            description: (
              <SessionFlyout title="Session K" mainSize="m" childSize="s" historyKey={historyKey} />
            ),
          },
          {
            title: 'Session L: main size = m, child size = fill',
            description: (
              <SessionFlyout
                title="Session L"
                mainSize="m"
                childSize="fill"
                historyKey={historyKey}
              />
            ),
          },
        ]}
      />
    </EuiPanel>
  </>
);
