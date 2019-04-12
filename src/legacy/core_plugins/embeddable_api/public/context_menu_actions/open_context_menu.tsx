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

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import { EventEmitter } from 'events';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';

let activeSession: ContextMenuSession | null = null;

const CONTAINER_ID = 'contextMenu-container';
let initialized = false;

function getOrCreateContainerElement() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.style.left = getMouseX() + 'px';
    container.style.top = getMouseY() + 'px';
    container.style.position = 'fixed';
    container.style.zIndex = '999';

    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  } else {
    container.style.left = getMouseX() + 'px';
    container.style.top = getMouseY() + 'px';
  }
  return container;
}

let x: number = 0;
let y: number = 0;

function initialize() {
  if (!initialized) {
    document.addEventListener('mousemove', onMouseUpdate, false);
    document.addEventListener('mouseenter', onMouseUpdate, false);
    initialized = true;
  }
}

function onMouseUpdate(e: any) {
  x = e.pageX;
  y = e.pageY;
}

function getMouseX() {
  return x;
}

function getMouseY() {
  return y;
}

initialize();

/**
 * A FlyoutSession describes the session of one opened flyout panel. It offers
 * methods to close the flyout panel again. If you open a flyout panel you should make
 * sure you call {@link ContextMenuSession#close} when it should be closed.
 * Since a flyout could also be closed without calling this method (e.g. because
 * the user closes it), you must listen to the "closed" event on this instance.
 * It will be emitted whenever the flyout will be closed and you should throw
 * away your reference to this instance whenever you receive that event.
 * @extends EventEmitter
 */
class ContextMenuSession extends EventEmitter {
  /**
   * Binds the current flyout session to an Angular scope, meaning this flyout
   * session will be closed as soon as the Angular scope gets destroyed.
   * @param {object} scope - An angular scope object to bind to.
   */
  public bindToAngularScope(scope: ng.IScope): void {
    const removeWatch = scope.$on('$destroy', () => this.close());
    this.on('closed', () => removeWatch());
  }

  /**
   * Closes the opened flyout as long as it's still the open one.
   * If this is not the active session anymore, this method won't do anything.
   * If this session was still active and a flyout was closed, the 'closed'
   * event will be emitted on this FlyoutSession instance.
   */
  public close(): void {
    if (activeSession === this) {
      const container = document.getElementById(CONTAINER_ID);
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
        this.emit('closed');
      }
    }
  }
}

/**
 * Opens a flyout panel with the given component inside. You can use
 * {@link ContextMenuSession#close} on the return value to close the flyout.
 *
 * @param flyoutChildren - Mounts the children inside a fly out panel
 * @return {FlyoutSession} The session instance for the opened flyout panel.
 */
export function openContextMenu(
  panels: EuiContextMenuPanelDescriptor[],
  props: {
    closeButtonAriaLabel?: string;
    onClose?: () => void;
    'data-test-subj'?: string;
  } = {}
): ContextMenuSession {
  // If there is an active inspector session close it before opening a new one.
  if (activeSession) {
    activeSession.close();
  }
  const container = getOrCreateContainerElement();
  const session = (activeSession = new ContextMenuSession());
  const onClose = () => {
    if (props.onClose) {
      props.onClose();
    }
    session.close();
  };

  ReactDOM.render(
    <I18nContext>
      <EuiPopover
        id="dashboardPanelContextMenu"
        className="dshPanel_optionsMenuPopover"
        button={container}
        isOpen={true}
        closePopover={onClose}
        panelPaddingSize="none"
        anchorPosition="downRight"
        withTitle
      >
        <EuiContextMenu initialPanelId="mainMenu" panels={panels} />
      </EuiPopover>
    </I18nContext>,
    container
  );

  return session;
}

export { ContextMenuSession };
