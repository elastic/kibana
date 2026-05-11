/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Describes a single follow-up key that can be pressed after a leader key sequence is opened.
 */
export interface LeaderKeyShortcut {
  /** The key that triggers this shortcut once the leader key overlay is active. */
  key: string;
  /** The short label rendered in the shortcut badge. */
  label: string;
  /** The human-readable description shown in the overlay and announced to assistive tech. */
  description: string;
  /** Runs when the shortcut key is pressed while this leader key menu is active. */
  onTrigger: () => void;
}

/**
 * Describes a leader-key shortcut group and the follow-up shortcuts it exposes.
 */
export interface LeaderKeyShortcutGroup {
  /** The key that opens this shortcut group. */
  leaderKey: string;
  /** The label shown for the leader key in the overlay and accessibility text. */
  leaderKeyDescription: string;
  /** The follow-up shortcuts available after the leader key is pressed. */
  shortcuts: LeaderKeyShortcut[];
}
