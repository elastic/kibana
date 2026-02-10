/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';

interface Props {
  overlays: OverlayStart;
}

/**
 * This component demonstrates a bug in the SystemFlyoutService:
 * When a parent flyout (session: 'start') closes, child flyouts (session: 'inherit')
 * remain open instead of being automatically closed.
 */
export const ParentChildSessionBug: React.FC<Props> = ({ overlays }) => {
  const openParentFlyout = () => {
    const parentFlyout = overlays.openSystemFlyout(
      <ParentFlyoutContent overlays={overlays} onClose={() => parentFlyout.close()} />,
      {
        id: 'parent-flyout-demo',
        title: 'Parent Flyout (session: start)',
        session: 'start',
        size: 'm',
        type: 'overlay',
        ownFocus: true,
        outsideClickCloses: false,
      }
    );
  };

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h3>Parent-Child Session Lifecycle Bug</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiCallOut title="Bug Demonstration" color="warning" iconType="bug">
        <p>
          This example demonstrates that child flyouts with{' '}
          <EuiCode>session: &quot;inherit&quot;</EuiCode>
          do not automatically close when their parent flyout closes.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <h4>Steps to reproduce:</h4>
        <ol>
          <li>Click the button below to open the parent flyout</li>
          <li>Inside the parent flyout, click &quot;Open Child Flyout&quot;</li>
          <li>
            Notice the child flyout appears (correctly) with{' '}
            <EuiCode>session: &quot;inherit&quot;</EuiCode>
          </li>
          <li>Close the parent flyout by clicking the &quot;Close Parent&quot; button</li>
          <li>
            <strong>BUG:</strong> The child flyout remains open!
          </li>
        </ol>
        <EuiSpacer size="s" />
        <h4>Expected behavior:</h4>
        <p>
          When a flyout with <EuiCode>session: &quot;start&quot;</EuiCode> closes, all child flyouts
          with <EuiCode>session: &quot;inherit&quot;</EuiCode> should automatically close as they
          are part of the same session lifecycle.
        </p>
        <EuiSpacer size="s" />
        <h4>Root cause:</h4>
        <p>
          The <EuiCode>SystemFlyoutService</EuiCode> tracks active flyouts but does not implement
          session-based lifecycle management. It needs to:
        </p>
        <ul>
          <li>Track parent-child relationships based on session parameter</li>
          <li>
            When closing a parent (session: start), find and close all children (session: inherit)
          </li>
        </ul>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton onClick={openParentFlyout} fill>
        Open Parent Flyout (Reproduce Bug)
      </EuiButton>
    </EuiPanel>
  );
};

const ParentFlyoutContent: React.FC<{ overlays: OverlayStart; onClose: () => void }> = ({
  overlays,
  onClose,
}) => {
  const openChildFlyout = () => {
    overlays.openSystemFlyout(<ChildFlyoutContent />, {
      id: 'child-flyout-demo',
      title: 'Child Flyout (session: inherit)',
      session: 'inherit',
      size: 's',
      type: 'overlay',
      outsideClickCloses: false,
    });
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Parent Flyout</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCallOut title="This is the parent flyout" color="primary" iconType="iInCircle">
          <p>
            This flyout was opened with <EuiCode>session: &quot;start&quot;</EuiCode>.
          </p>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <EuiText>
          <p>
            Now click the button below to open a child flyout. The child will use{' '}
            <EuiCode>session: &quot;inherit&quot;</EuiCode> which means it should be part of this
            parent&apos;s session.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton onClick={openChildFlyout} iconType="arrowRight">
          Open Child Flyout
        </EuiButton>
        <EuiSpacer size="l" />
        <EuiCallOut title="Now close this parent flyout" color="warning">
          <p>
            After opening the child flyout above, close this parent flyout using the button below.
            Watch what happens to the child flyout - it should close automatically but it
            doesn&apos;t (this is the bug).
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            <strong>Check the browser console</strong> for debug logs showing:
          </p>
          <ul>
            <li>When flyouts are opened (with their session type)</li>
            <li>Active flyouts list</li>
            <li>When flyouts are closed</li>
          </ul>
          <p>
            You&apos;ll see the child flyout remains in the active flyouts list after the parent
            closes.
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType="cross">
              Close Parent (Trigger Bug)
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

const ChildFlyoutContent: React.FC = () => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>Child Flyout</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCallOut title="This is the child flyout" color="success" iconType="check">
          <p>
            This flyout was opened with <EuiCode>session: &quot;inherit&quot;</EuiCode>.
          </p>
          <p>It correctly appears as a child (stacked on top of the parent).</p>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <EuiCallOut
          title="🐛 Bug: This flyout should close automatically"
          color="danger"
          iconType="alert"
        >
          <p>
            When you close the parent flyout, this child flyout should automatically close since
            it&apos;s part of the same session (<EuiCode>session: &quot;inherit&quot;</EuiCode>).
          </p>
          <p>
            <strong>But it doesn&apos;t!</strong> The child stays open even after the parent closes.
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>Go back to the parent flyout and click &quot;Close Parent&quot; to see the bug.</p>
          <p>This child flyout will remain open and you&apos;ll need to close it manually.</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiText size="xs" color="subdued">
          <p>This flyout should have closed automatically when the parent closed.</p>
        </EuiText>
      </EuiFlyoutFooter>
    </>
  );
};
