/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiPopover } from '@elastic/eui';
import { EventEmitter } from 'events';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { getTheme } from '../services';

let activeSession: ContextMenuSession | null = null;

const CONTAINER_ID = 'contextMenu-container';

/**
 * Tries to find best position for opening context menu using mousemove and click event
 * Returned position is relative to document
 */
export function createInteractionPositionTracker() {
  let lastMouseX = 0;
  let lastMouseY = 0;
  const lastClicks: Array<{ el?: Element; mouseX: number; mouseY: number }> = [];
  const MAX_LAST_CLICKS = 10;

  /**
   * Track both `mouseup` and `click`
   * `mouseup` is for clicks and brushes with mouse
   * `click` is a fallback for keyboard interactions
   */
  document.addEventListener('mouseup', onClick, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('mousemove', onMouseUpdate, { passive: true });
  document.addEventListener('mouseenter', onMouseUpdate, { passive: true });
  function onClick(event: MouseEvent) {
    lastClicks.push({
      el: event.target as Element,
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
    if (lastClicks.length > MAX_LAST_CLICKS) {
      lastClicks.shift();
    }
  }
  function onMouseUpdate(event: MouseEvent) {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }

  return {
    resolveLastPosition: (): { x: number; y: number } => {
      const lastClick = [...lastClicks]
        .reverse()
        .find(({ el }) => el && document.body.contains(el));
      if (!lastClick) {
        // fallback to last mouse position
        return {
          x: lastMouseX,
          y: lastMouseY,
        };
      }

      const { top, left, bottom, right } = lastClick.el!.getBoundingClientRect();

      const mouseX = lastClick.mouseX;
      const mouseY = lastClick.mouseY;

      if (top <= mouseY && bottom >= mouseY && left <= mouseX && right >= mouseX) {
        // click was inside target element
        return {
          x: mouseX,
          y: mouseY,
        };
      } else {
        // keyboard edge case. no cursor position. use target element position instead
        return {
          x: left + (right - left) / 2,
          y: bottom,
        };
      }
    },
  };
}

const { resolveLastPosition } = createInteractionPositionTracker();
function getOrCreateContainerElement() {
  let container = document.getElementById(CONTAINER_ID);
  let { x, y } = resolveLastPosition();
  y = y + window.scrollY;
  x = x + window.scrollX;

  if (!container) {
    container = document.createElement('div');
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.position = 'absolute';

    // EUI tooltip uses 9000
    // have to make it larger to display menu on top of tooltips from charts
    container.style.zIndex = '9999';

    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  } else {
    container.style.left = x + 'px';
    container.style.top = y + 'px';
  }
  return container;
}

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
   * Closes the opened flyout as long as it's still the open one.
   * If this is not the active session, this method will do nothing.
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
    <KibanaThemeProvider theme$={getTheme().theme$}>
      <EuiPopover
        className="embPanel__optionsMenuPopover"
        button={container}
        isOpen={true}
        closePopover={onClose}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu
          initialPanelId="mainMenu"
          panels={panels}
          data-test-subj={props['data-test-subj']}
        />
      </EuiPopover>
    </KibanaThemeProvider>,
    container
  );

  return session;
}

export { ContextMenuSession };
