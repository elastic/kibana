/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiText, EuiLink } from '@elastic/eui';

export const Overview = () => {
  return (
    <EuiText>
      <h1>Overview</h1>
      <p>
        Actions and triggers are an event system abstraction that decouples firing an event and
        responding to an event.
      </p>
      Key concepts:
      <ul>
        <li>
          <strong>Trigger</strong> is an id that represents an event type, for example
          <em>PANEL_CLICK</em>.
        </li>
        <li>
          <strong>Action</strong> is a{' '}
          <EuiLink
            href="https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/ui_actions/public/actions/action.ts"
            target="_blank"
          >
            class
          </EuiLink>{' '}
          that responds to an event. Multiple actions can be registered to an event type. Actions
          can respond to multiple event types.
        </li>
        <li>
          <strong>Context</strong> is runtime state passed between an event and the responder of an
          event.
        </li>
      </ul>
      <p>
        The purpose for the event system abstraction is to make event handling extensible, allowing
        plugins to register their own event types and responses and register responses to existing
        event types.
      </p>
      <p>
        Use triggers to make your plugin extensible. For example, your plugin could register a
        trigger. Then, other plugins can extend your plugin by registering new actions for the
        trigger. Finally, when the trigger is fired, all attached actions are available.
      </p>
    </EuiText>
  );
};
