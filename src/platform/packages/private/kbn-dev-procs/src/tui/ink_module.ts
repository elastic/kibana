/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, ReactElement, ReactNode } from 'react';

// `ink` is ESM-only with top-level await, so Babel's CJS output cannot require it and TypeScript's
// bundler resolution cannot see its types from this package. scripts/dev.js loads it with a native
// import() and passes it in; this is the part of its API the TUI uses.

export interface InkBoxProps {
  readonly children?: ReactNode;
  readonly flexDirection?: 'row' | 'column';
  readonly flexGrow?: number;
  readonly flexShrink?: number;
  readonly justifyContent?: 'flex-start' | 'flex-end' | 'space-between' | 'center';
  readonly width?: number | string;
  readonly height?: number | string;
  readonly paddingX?: number;
  readonly borderStyle?: 'round' | 'single';
  readonly borderColor?: string;
  readonly overflow?: 'visible' | 'hidden';
}

export interface InkTextProps {
  readonly children?: ReactNode;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly bold?: boolean;
  readonly dimColor?: boolean;
  readonly inverse?: boolean;
  readonly wrap?: 'wrap' | 'truncate-end';
}

export interface InkKey {
  readonly upArrow: boolean;
  readonly downArrow: boolean;
  readonly leftArrow: boolean;
  readonly rightArrow: boolean;
  readonly pageUp: boolean;
  readonly pageDown: boolean;
  readonly return: boolean;
  readonly tab: boolean;
  readonly escape: boolean;
  readonly ctrl: boolean;
  readonly backspace: boolean;
  readonly delete: boolean;
}

export interface InkInstance {
  readonly unmount: () => void;
  readonly waitUntilExit: () => Promise<void>;
}

export interface InkModule {
  readonly Box: ComponentType<InkBoxProps>;
  readonly Text: ComponentType<InkTextProps>;
  readonly useInput: (handler: (input: string, key: InkKey) => void) => void;
  readonly useStdout: () => { readonly stdout: NodeJS.WriteStream };
  readonly render: (
    node: ReactElement,
    options: {
      readonly exitOnCtrlC: boolean;
      readonly patchConsole: boolean;
      readonly stdout: NodeJS.WriteStream;
    }
  ) => InkInstance;
}
