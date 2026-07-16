/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HardcodedIcons } from '@kbn/workflows-ui';

/**
 * Step / connector actionTypeIds whose icon is a monochrome glyph and should be
 * rendered via `mask-image + background-color: currentColor` so it inherits the
 * theme text color (legible in both light and dark mode) instead of the SVG's
 * default black fill.
 */
export const MonochromeIcons = new Set([
  'manual',
  'alert',
  'scheduled',
  'console',
  'if',
  'foreach',
  'while',
  'switch',
  'parallel',
  'merge',
  'wait',
  'waitForInput',
  'waitForApproval',
  'data.set',
  'workflow.execute',
  'workflow.executeAsync',
  'workflow.output',
  'workflow.fail',
  // connector icons, which are monochrome and should be colored with currentColor
  '.http',
  '.inference',
  '.email',
  '.gen-ai',
  '.bedrock',
]);

/**
 * Data URLs of the bundled hardcoded SVGs in `kbn-workflows-ui` that render as
 * monochrome glyphs (i.e. have no `fill` attribute and inherit the SVG default
 * black fill). Icons resolved to any of these URLs should also be rendered via
 * `mask-image + currentColor` — even when the caller's `actionTypeId` isn't in
 * `MonochromeIcons` above (e.g. registered custom step types that reuse a
 * bundled glyph, or the `plugs` / `bolt` fallbacks for unknown types).
 *
 * Brand logos (Elasticsearch, Kibana, Slack) are intentionally excluded so
 * they keep their coloured fills.
 */
export const MonochromeIconUrls: Set<string> = new Set(
  [
    HardcodedIcons.default, // plugs — unknown step fallback
    HardcodedIcons.trigger, // bolt — unknown trigger fallback
    HardcodedIcons.wait, // clock
    HardcodedIcons.scheduled, // clock
    HardcodedIcons['data.set'], // database
    HardcodedIcons.switch, // product_streams_wired
    HardcodedIcons.waitForInput, // user
    HardcodedIcons.waitForApproval, // user
    HardcodedIcons.manual, // user
    HardcodedIcons.alert, // warning
    HardcodedIcons.parallel,
    HardcodedIcons['workflow.execute'], // glyph
    HardcodedIcons['workflow.executeAsync'], // union
    HardcodedIcons['workflow.output'], // output
    HardcodedIcons['workflow.fail'], // fail
    HardcodedIcons['.email'], // email
    HardcodedIcons['.inference'], // sparkles
  ].filter((url): url is string => typeof url === 'string' && url.startsWith('data:'))
);

/** True when the icon resolved for this step/connector should render in the theme text color. */
export const isMonochromeIcon = (actionTypeId: string, resolvedIconUrl?: string): boolean =>
  MonochromeIcons.has(actionTypeId) ||
  (resolvedIconUrl !== undefined && MonochromeIconUrls.has(resolvedIconUrl));
