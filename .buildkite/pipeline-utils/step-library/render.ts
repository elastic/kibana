/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from "yaml";
import { registerCancelKeys } from "../buildkite/utils.ts";
import type { Step } from "./types.ts";

export interface RenderOptions {
  cancelOnGateFailure?: boolean; // Register command-step keys so a failing gate step cancels them.

  // Keep the leading `steps:` line instead of emitting a bare chunk.
  // TODO: remove this field and always emit the leading `steps:` once the migration is complete.
  header?: boolean;
}

// Mirror `extractStepKeys` from `buildkite/utils.ts`
export const getStepKeys = (steps: readonly Step[]): string[] =>
  steps.flatMap((generic) => {
    // The SDK's step union includes plain strings ('wait'), and its step types are interfaces,
    // so read them as records.
    if (typeof generic === "string") {
      return [];
    }

    const step = generic as Record<string, unknown>;

    if (typeof step.group === "string" && Array.isArray(step.steps)) {
      return getStepKeys(step.steps);
    }

    if (typeof step.command !== "string") {
      return [];
    }

    if (typeof step.key !== "string") {
      throw new Error(
        `step "${String(step.label ?? step.command)}" is missing a "key" (required for cancelOnGateFailure)`,
      );
    }

    return [step.key];
  });

export const renderSteps = (
  steps: readonly Step[],
  { cancelOnGateFailure = false, header = false }: RenderOptions = {},
): string => {
  if (cancelOnGateFailure) {
    registerCancelKeys(getStepKeys(steps));
  }

  // lineWidth 0 stops from folding long commands. The default indentSeq keeps list items two
  // spaces in, which is what lets this chunk continue a document that already has `steps:`.
  const text = stringify({ steps }, { lineWidth: 0 });
  return header ? text : text.replace(/^steps:/, "");
};
