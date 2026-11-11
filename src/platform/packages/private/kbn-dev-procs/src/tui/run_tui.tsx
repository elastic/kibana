/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Supervisor } from '../supervisor';
import type { InkInstance, InkModule } from './ink_module';
import { createSynchronizedStdout } from './synchronized_stdout';
import { createTuiApp } from './tui_app';

/** Shows the TUI, starts every process, and resolves once the user quit and every process has stopped. */
export const runTui = async (ink: InkModule, supervisor: Supervisor): Promise<void> => {
  const TuiApp = createTuiApp(ink);
  let isQuitting = false;
  let isStarted = false;
  const startAll = () => {
    if (!isStarted) {
      isStarted = true;
      void supervisor.startAll();
    }
  };
  const quit = async (instance: InkInstance) => {
    if (isQuitting) {
      return;
    }
    isQuitting = true;
    await supervisor.stopAll();
    instance.unmount();
  };

  const instance = ink.render(
    <TuiApp supervisor={supervisor} onSubscribed={startAll} onQuit={() => void quit(instance)} />,
    {
      // Raw mode turns Ctrl+C into a key press, which the app handles like q so that processes stop gracefully.
      exitOnCtrlC: false,
      patchConsole: true,
      stdout: createSynchronizedStdout(process.stdout),
    }
  );
  await instance.waitUntilExit();
};
