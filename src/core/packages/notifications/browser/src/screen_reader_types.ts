/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Exposes public API of the screen reader announcer during the start phase.
 * @public
 */
export interface ScreenReaderStart {
  /**
   * Announces a message to screen reader users, without moving focus.
   *
   * Use it for status messages that are visually obvious but would otherwise be missed,
   * e.g. results being filtered or a form being reset. Toasts are announced automatically.
   *
   * Messages share one queue with toast and page change announcements, so they don't
   * interrupt each other. Messages sent close together are announced as one.
   *
   * Announcements are assertive: they interrupt what the screen reader is reading, so they're
   * still heard when the same action moves focus. Only announce meaningful status changes,
   * and not on every keystroke, e.g. wait until the user stops typing.
   *
   * VoiceOver doesn't read announcements while a modal (e.g. EuiModal, EuiFlyout) is open.
   * For feedback about content inside an open modal, e.g. form errors, show it inside the modal.
   *
   * @param message The localized text to announce.
   */
  notify(message: string): void;
}
