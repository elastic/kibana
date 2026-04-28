/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * EBT click action name constants.
 *
 * These values populate the `data-ebt-action` HTML attribute and map to the
 * `click.action` field in EBT click events.
 *
 * ## Naming convention: intent over implementation
 *
 * Action names must express what the user *intends* to do, not what the UI does
 * underneath. For example, a link that currently opens an error in Discover should
 * be named `viewError`, not `openInDiscover` — because if the destination changes
 * tomorrow (e.g. to APM or a flyout), the user intent is still "view the error"
 * and we should not need to update every call site.
 *
 * Use `openInDiscover` only when the user explicitly chooses to open something in
 * Discover (e.g. a button that says "Open in Discover").
 */

/** Navigates to the Discover app. */
export const EBT_CLICK_ACTION_OPEN_IN_DISCOVER = 'openInDiscover';
