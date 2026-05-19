/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFirstFiberWithDebugSource } from './fiber/find_first_fiber_with_debug_source';
import type { ReactFiberNode } from './fiber/types';

/**
 * Distinct reasons for live-preview failure. Each value identifies a specific
 * step in the DevTools `overrideProps` pipeline so we can diagnose by reading
 * the message instead of one catch-all "element_not_in_devtools".
 */
export type ForceRerenderReason =
  | 'devtools_hook_missing' // window.__REACT_DEVTOOLS_GLOBAL_HOOK__ undefined
  | 'no_renderer_interfaces' // hook.rendererInterfaces map missing or empty
  | 'fiber_not_found' // findFirstFiberWithDebugSource returned null
  | 'getfiberidfornative_missing' // no renderer interface exposes this method
  | 'overrideprops_missing' // no renderer interface exposes overrideProps
  | 'id_lookup_failed' // getFiberIDForNative returned null for every attempted node
  | 'component_id_not_resolved' // got a host-fiber ID but no owner matched the target component
  | 'override_threw'; // overrideProps was called but threw an exception

interface OwnerEntry {
  id: number;
  displayName: string | null;
}

export type ForceRerenderResult =
  | { ok: true }
  | { ok: false; reason: ForceRerenderReason; detail?: string };

/**
 * Walks down the fiber child chain to find the first host fiber (a fiber whose
 * type is a DOM tag string, meaning it has a real DOM stateNode).
 */
const findFirstHostFiber = (fiber: ReactFiberNode | null | undefined): ReactFiberNode | null => {
  if (!fiber) {
    return null;
  }
  if (typeof fiber.type === 'string') {
    return fiber;
  }
  return findFirstHostFiber(fiber.child);
};

/**
 * Best-effort display name for a fiber's `type`. Handles plain function/class
 * components plus the wrappers React DevTools also unwraps:
 *   - `React.forwardRef(...)`  → object with `render` function.
 *   - `React.memo(...)`        → object with inner `type`.
 *   - `React.lazy(...)`        → object with `_payload` / `_init` (display name
 *     only available after resolution; we read `displayName` if present).
 * Returns `null` for host primitives (`'div'`, `'span'`, ...) and for anything
 * we can't name.
 */
/**
 * `"Anonymous"` is React DevTools' fallback display name for fibers without a
 * resolvable `displayName` / function name — it is not an identifier we can
 * use to disambiguate an entry in the owner chain (and matching against it
 * would pick the first nameless wrapper, not what the user intended). Treat
 * it the same as no name.
 */
const DEVTOOLS_ANONYMOUS_FALLBACK = 'Anonymous';

const isUsableComponentName = (name: string | null | undefined): name is string =>
  typeof name === 'string' && name !== '' && name !== DEVTOOLS_ANONYMOUS_FALLBACK;

const getComponentDisplayName = (type: unknown): string | null => {
  if (type == null) {
    return null;
  }
  if (typeof type === 'string') {
    return null;
  }
  const pick = (...candidates: Array<string | null | undefined>): string | null => {
    for (const candidate of candidates) {
      if (isUsableComponentName(candidate)) {
        return candidate;
      }
    }
    return null;
  };
  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string };
    return pick(fn.displayName, fn.name);
  }
  if (typeof type === 'object') {
    const obj = type as {
      displayName?: string;
      render?: { displayName?: string; name?: string };
      type?: unknown;
    };
    const direct = pick(obj.displayName);
    if (direct) {
      return direct;
    }
    if (obj.render) {
      const rendered = pick(obj.render.displayName, obj.render.name);
      if (rendered) {
        return rendered;
      }
    }
    if (obj.type !== undefined) {
      return getComponentDisplayName(obj.type);
    }
  }
  return null;
};

/**
 * Match a target component name against a DevTools owner-chain entry. DevTools
 * versions render wrapper-type names differently:
 *   - `Foo`               (plain match)
 *   - `ForwardRef(Foo)`
 *   - `Memo(ForwardRef(Foo))`
 *   - `ForwardRef`        (no inner name resolved)
 * Accept any of these as a hit. We split on non-identifier characters so
 * `ForwardRef(Foo)` becomes `['ForwardRef', 'Foo']` and check membership.
 */
const ownerEntryMatchesName = (entry: OwnerEntry, name: string): boolean => {
  const display = entry.displayName;
  if (!display) {
    return false;
  }
  if (display === name) {
    return true;
  }
  const tokens = display.split(/[^A-Za-z0-9_$]+/).filter(Boolean);
  return tokens.includes(name);
};

interface RendererInterface {
  // Legacy name (React DevTools <= v4).
  getFiberIDForNative?: (
    node: HTMLElement,
    findNearestUnfilteredAncestor: boolean
  ) => number | null;
  // Current name (React DevTools v5+).
  getElementIDForHostInstance?: (
    node: HTMLElement,
    findNearestUnfilteredAncestor?: boolean
  ) => number | null;
  // Legacy override (React DevTools <= v4).
  overrideProps?: (id: number, path: string[], value: unknown) => void;
  // Current unified override (React DevTools v5+).
  overrideValueAtPath?: (
    type: 'props' | 'state' | 'hooks' | 'context',
    id: number,
    hookID: number | null,
    path: string[],
    value: unknown
  ) => void;
  // The _debugOwner JSX-author chain for a given element. The first entry is
  // the most direct owner (the component that emitted this element in its
  // render), then up the tree. Used to walk from a host fiber's ID to the
  // ID of the component fiber whose props we actually want to override.
  getOwnersList?: (elementID: number) => OwnerEntry[] | null;
  // Display name for a given element ID — `'div'` / `'span'` for host
  // components, the component's `displayName` for component fibers. We use
  // this to identify whether the ID returned by getElementIDForHostInstance
  // is already the component we want.
  getDisplayNameForElementID?: (elementID: number) => string | null;
  // Returns the underlying function/class for an element ID. DevTools'
  // contract:
  //   - FunctionComponent / ClassComponent → fiber.type (the function/class)
  //   - ForwardRef                          → fiber.type.render
  //   - Memo / SimpleMemoComponent          → unwrapped inner type
  //   - everything else                     → null
  // We use this as a *cheap pre-filter* — names like `ForwardRef(Anonymous)`
  // and `Memo(Anonymous)` show up many times per page (Emotion's
  // `css`-prop wrapper is itself a single shared anonymous forwardRef used
  // on every styled element), so reference equality alone is not unique.
  // We disambiguate further with `inspectElement`'s source location.
  getElementSourceFunctionById?: (elementID: number) => unknown;
  // Synchronously serializes an element and returns it with its source
  // location (`fiber._debugSource`). We compare that to *our* fiber's
  // `_debugSource` to pick the unique JSX call site, since every JSX site
  // has a unique `{fileName, lineNumber, columnNumber}` triple.
  inspectElement?: (
    requestID: number,
    elementID: number,
    path: Array<string | number> | null,
    forceFullData: boolean
  ) => InspectedElementPayload | null | undefined;
}

interface InspectedElementSource {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface InspectedElementPayload {
  type?: string;
  value?: {
    source?: InspectedElementSource | null;
  } | null;
}

/**
 * React fiber `tag` values relevant to source-function resolution. Mirror the
 * minimal subset we need from React's `WorkTag` enum.
 */
const FIBER_TAG_FUNCTION_COMPONENT = 0;
const FIBER_TAG_CLASS_COMPONENT = 1;
const FIBER_TAG_FORWARD_REF = 11;
const FIBER_TAG_MEMO_COMPONENT = 14;
const FIBER_TAG_SIMPLE_MEMO_COMPONENT = 15;
const FIBER_TAG_INCOMPLETE_CLASS_COMPONENT = 17;

/**
 * Monotonically increasing request ID for `inspectElement` calls. DevTools
 * uses request IDs to correlate async bridge messages, but the renderer
 * interface's synchronous path also accepts one — we just need any number
 * that doesn't collide with concurrent calls within this session.
 */
let inspectRequestCounter = 0;
const generateRequestID = (): number => {
  inspectRequestCounter += 1;
  return inspectRequestCounter;
};

/**
 * Two source locations refer to the same JSX call site iff their `fileName`,
 * `lineNumber`, and `columnNumber` all match. Any missing field on either
 * side is a non-match — we'd rather fail to resolve than match the wrong
 * fiber and write props to the wrong place.
 */
const sourcesMatch = (a: InspectedElementSource, b: InspectedElementSource): boolean => {
  if (!a.fileName || !b.fileName) {
    return false;
  }
  if (a.lineNumber !== b.lineNumber) {
    return false;
  }
  // Compare file names by suffix. DevTools may normalize paths (workspace
  // prefix stripped, separators swapped, `webpack-internal:///` prefix added)
  // while `fiber._debugSource.fileName` is an absolute path. Accept either
  // string being a suffix of the other.
  const longer = a.fileName.length >= b.fileName.length ? a.fileName : b.fileName;
  const shorter = longer === a.fileName ? b.fileName : a.fileName;
  if (longer !== shorter && !longer.endsWith(shorter)) {
    return false;
  }
  // Column is informational — match when both sides have it, otherwise
  // accept the line match. Some DevTools builds drop column.
  if (
    typeof a.columnNumber === 'number' &&
    typeof b.columnNumber === 'number' &&
    a.columnNumber !== b.columnNumber
  ) {
    return false;
  }
  return true;
};

/**
 * `inspectElement` payloads vary across DevTools versions. The source object
 * is most commonly at `payload.value.source`, but some builds put it at
 * `payload.source` or `payload.value._debugSource`. Probe each location and
 * return the first one carrying a `fileName`.
 */
const extractSourceFromPayload = (payload: unknown): InspectedElementSource | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const root = payload as { source?: InspectedElementSource; value?: unknown };
  const candidates: Array<InspectedElementSource | undefined> = [root.source];
  if (root.value && typeof root.value === 'object') {
    const v = root.value as {
      source?: InspectedElementSource;
      _debugSource?: InspectedElementSource;
    };
    candidates.push(v.source);
    candidates.push(v._debugSource);
  }
  for (const candidate of candidates) {
    if (candidate && candidate.fileName) {
      return candidate;
    }
  }
  return null;
};

/**
 * Returns the same value `getElementSourceFunctionById` would, but computed
 * from a fiber we already hold. We compare these for reference equality to
 * locate our fiber's ID inside DevTools' owner chain.
 */
const getSourceFunctionForFiber = (fiber: ReactFiberNode): unknown => {
  const { tag } = fiber as ReactFiberNode & { tag?: number };
  const elementType = (fiber as ReactFiberNode & { elementType?: unknown }).elementType;
  switch (tag) {
    case FIBER_TAG_FUNCTION_COMPONENT:
    case FIBER_TAG_CLASS_COMPONENT:
    case FIBER_TAG_INCOMPLETE_CLASS_COMPONENT:
      return fiber.type;
    case FIBER_TAG_FORWARD_REF:
      return (fiber.type as { render?: unknown } | null)?.render ?? null;
    case FIBER_TAG_MEMO_COMPONENT:
    case FIBER_TAG_SIMPLE_MEMO_COMPONENT: {
      const inner = (elementType as { type?: unknown } | null)?.type;
      return inner ?? fiber.type;
    }
    default:
      return null;
  }
};

/**
 * Returns a normalized `(node, findNearest) => id | null` from whichever name
 * the renderer interface exposes. React DevTools renamed `getFiberIDForNative`
 * to `getElementIDForHostInstance` in v5; we support both.
 */
const resolveGetElementID = (ri: RendererInterface) => {
  if (typeof ri.getElementIDForHostInstance === 'function') {
    return (node: HTMLElement, findNearest: boolean) =>
      ri.getElementIDForHostInstance!(node, findNearest);
  }
  if (typeof ri.getFiberIDForNative === 'function') {
    return (node: HTMLElement, findNearest: boolean) => ri.getFiberIDForNative!(node, findNearest);
  }
  return null;
};

/**
 * Returns a normalized `(id, path, value) => void` that writes a props
 * override. Tries the v5+ `overrideValueAtPath` first, falls back to the
 * legacy `overrideProps`. Returns `null` if neither is exposed.
 */
const resolveOverrideProps = (ri: RendererInterface) => {
  if (typeof ri.overrideValueAtPath === 'function') {
    return (id: number, path: string[], value: unknown) =>
      ri.overrideValueAtPath!('props', id, null, path, value);
  }
  if (typeof ri.overrideProps === 'function') {
    return (id: number, path: string[], value: unknown) => ri.overrideProps!(id, path, value);
  }
  return null;
};

/**
 * Forces a live re-render of the component associated with `domNode` with one
 * prop overridden to `newValue`, using the React DevTools renderer interface.
 *
 * Requires the React DevTools browser extension to be installed. The extension
 * injects __REACT_DEVTOOLS_GLOBAL_HOOK__ at page load and populates renderer
 * interfaces on every React renderer mount — the panel itself does NOT need to
 * be open for this to work, but the extension must be installed.
 *
 * If any step fails the returned `reason` pinpoints which one, so the UI can
 * surface an actionable error rather than a generic "preview failed".
 */
export const forceRerenderWithProps = (
  domNode: HTMLElement,
  propName: string,
  newValue: unknown
): ForceRerenderResult => {
  const hook = (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) {
    return { ok: false, reason: 'devtools_hook_missing' };
  }

  const rendererInterfaces = (hook as Record<string, unknown>).rendererInterfaces as
    | Map<number, RendererInterface>
    | undefined;

  if (!rendererInterfaces || rendererInterfaces.size === 0) {
    return { ok: false, reason: 'no_renderer_interfaces' };
  }

  const fiber = findFirstFiberWithDebugSource(domNode);
  if (!fiber) {
    return { ok: false, reason: 'fiber_not_found' };
  }

  // Diagnostic: what fiber did we actually resolve? If `tag === 5` this is a
  // HostComponent (a raw DOM element) and `findFirstFiberWithDebugSource`
  // itself is the bug, not the DevTools call. Component fibers have other
  // tags (0 = FunctionComponent, 1 = ClassComponent, 11 = ForwardRef,
  // 14 = MemoComponent, etc.).
  // eslint-disable-next-line no-console
  console.debug('[inspect_component] target fiber:', {
    tag: (fiber as ReactFiberNode & { tag?: number }).tag,
    typeName:
      typeof fiber.type === 'function'
        ? (fiber.type as { displayName?: string; name?: string }).displayName ||
          (fiber.type as { name?: string }).name ||
          '(anonymous fn)'
        : String(fiber.type),
    hasDebugSource: Boolean((fiber as ReactFiberNode & { _debugSource?: unknown })._debugSource),
    memoizedPropsKeys: Object.keys((fiber.memoizedProps as object | null) ?? {}),
  });

  // Build the list of candidate lookup nodes, in order of preference:
  //   1. `domNode` itself — the actual element under the cursor. React always
  //      knows which fiber owns this (via __reactFiber$xxx) and DevTools
  //      registers it during commit, so this is the most reliable lookup.
  //      getFiberIDForNative(..., true) walks up to the nearest unfiltered
  //      ancestor, which is typically the component fiber we want.
  //   2. The stateNode of `fiber.element` — the element we stored on the fiber
  //      cursor during traversal. Useful when domNode is, e.g., an SVG that
  //      was replaced with its parentElement upstream.
  //   3. The first host descendant of the component fiber. Last resort.
  const candidates: HTMLElement[] = [];
  if (domNode instanceof HTMLElement) {
    candidates.push(domNode);
  }
  const fiberElement = (fiber as ReactFiberNode & { element?: unknown }).element;
  if (fiberElement instanceof HTMLElement && !candidates.includes(fiberElement)) {
    candidates.push(fiberElement);
  }
  const hostFiber = findFirstHostFiber(fiber.child);
  if (
    hostFiber?.stateNode instanceof HTMLElement &&
    !candidates.includes(hostFiber.stateNode as HTMLElement)
  ) {
    candidates.push(hostFiber.stateNode as HTMLElement);
  }

  // Two ways to locate our fiber in DevTools' owner chain, in order of
  // reliability:
  //   1. Reference-equality on the fiber's source function. This is the
  //      authoritative match — DevTools' `getElementSourceFunctionById`
  //      returns the very same function/class object that `fiber.type` (or
  //      `fiber.type.render`, for forwardRef) points to in our world.
  //      Unique by construction, even when the chain has many
  //      `ForwardRef(Anonymous)` / `Memo(Anonymous)` entries (Emotion's
  //      `css`-prop wrapper is one such anonymous forwardRef per styled
  //      element, so this case shows up everywhere in Kibana).
  //   2. Display-name match against `getComponentDisplayName(fiber.type)`.
  //      Used only when DevTools doesn't expose source-function lookup. The
  //      wrapper-aware matcher accepts `Foo`, `ForwardRef(Foo)`,
  //      `Memo(ForwardRef(Foo))`, etc.
  const targetComponentName = getComponentDisplayName(fiber.type);
  const targetSourceFn = getSourceFunctionForFiber(fiber);
  // eslint-disable-next-line no-console
  console.debug('[inspect_component] target identity:', {
    name: targetComponentName,
    hasSourceFn: targetSourceFn != null,
    fiberTag: (fiber as ReactFiberNode & { tag?: number }).tag,
  });

  // Track what we've seen across all renderer interfaces so we can return the
  // most informative failure reason at the end.
  let anyHasGetID = false;
  let anyHasOverride = false;
  let sawHostIDButNoMatch = false;
  // Snapshot of the most recent owner chain we tried to match against —
  // surfaced in the failure `detail` so the user can see what DevTools
  // returned without having to expand the console.
  let lastChain: OwnerEntry[] | null = null;
  const lookupAttempts: string[] = [];

  for (const [rendererID, ri] of rendererInterfaces) {
    // Unconditional dump — even on the success path we want to see what else
    // is available on the renderer interface (inspectElement,
    // findHostInstancesForElementID, getNearestMountedDOMNode, etc.) so we
    // can pick a better lookup strategy if the current one targets the wrong
    // fiber.
    // eslint-disable-next-line no-console
    console.debug('[inspect_component] renderer', rendererID, 'keys:', Object.keys(ri ?? {}));

    const getID = resolveGetElementID(ri);
    const overrideFn = resolveOverrideProps(ri);
    if (getID) {
      anyHasGetID = true;
    }
    if (overrideFn) {
      anyHasOverride = true;
    }

    if (!getID || !overrideFn) {
      // eslint-disable-next-line no-console
      console.debug('[inspect_component] renderer', rendererID, 'missing methods:', {
        hasGetID: Boolean(getID),
        hasOverride: Boolean(overrideFn),
      });
      continue;
    }

    for (const candidate of candidates) {
      const hostID = getID(candidate, true);
      lookupAttempts.push(
        `renderer=${rendererID} tag=${candidate.tagName.toLowerCase()} → id=${hostID}`
      );
      if (hostID == null) {
        continue;
      }

      // Modern DevTools' getElementIDForHostInstance returns the *host* fiber's
      // ID — `findNearestUnfilteredAncestor=true` no longer walks past host
      // fibers in many builds. We need the COMPONENT fiber's ID. Build the
      // candidate chain [hostID, ...owners] and find the entry whose
      // displayName matches our target component. The first entry of
      // getOwnersList is the most direct JSX-owner (the component that emitted
      // this element), which is exactly what we want for most cases.
      const hostDisplayName = ri.getDisplayNameForElementID?.(hostID) ?? null;
      const owners = ri.getOwnersList?.(hostID) ?? [];
      const chain: OwnerEntry[] = [{ id: hostID, displayName: hostDisplayName }, ...owners];
      lastChain = chain;

      // Resolution strategy, in order of reliability:
      //   1. Source-function pre-filter + `_debugSource` verification. We
      //      first narrow chain entries by reference-equality on the fiber's
      //      source function (cheap), then verify each candidate's source
      //      location matches our fiber's `_debugSource`. This is needed
      //      because shared wrappers like Emotion's `css`-prop component
      //      reuse a single `EmotionCssPropInternal.render` across every
      //      styled element on the page — so source-fn equality alone can
      //      match many entries. The `{fileName, lineNumber, columnNumber}`
      //      triple is unique per JSX call site.
      //   2. Source-function pre-filter alone. If `inspectElement` isn't
      //      exposed (older DevTools) AND the source-fn match has exactly
      //      one candidate, take it.
      //   3. Wrapper-aware name match. Fallback for fibers whose source
      //      function isn't exposed by DevTools at all.
      // We intentionally do NOT use any heuristic like "first non-host
      // owner": intermediaries such as `EuiButtonControlButton` commonly
      // forward unknown props to a host element via `{...rest}`, so picking
      // them ends up writing the prop onto the DOM (e.g. `compressed="false"`
      // on a `<button>`). Better to fail loudly with the chain in the detail
      // than to silently target the wrong fiber.
      let targetID: number | null = null;
      let resolutionMethod: 'source-fn+source' | 'source-fn-unique' | 'name' | null = null;
      let sourceFnCandidates: number[] = [];
      const ourDebugSource = (fiber as ReactFiberNode & { _debugSource?: InspectedElementSource })
        ._debugSource;

      if (targetSourceFn != null && typeof ri.getElementSourceFunctionById === 'function') {
        const lookup = ri.getElementSourceFunctionById;
        const candidates: number[] = [];
        for (const entry of chain) {
          let entryFn: unknown = null;
          try {
            entryFn = lookup(entry.id);
          } catch {
            continue;
          }
          if (entryFn && entryFn === targetSourceFn) {
            candidates.push(entry.id);
          }
        }
        sourceFnCandidates = candidates;

        const inspect = ri.inspectElement;
        if (candidates.length > 1 && typeof inspect === 'function' && ourDebugSource) {
          // Multiple wrappers share our source function (typical for Emotion
          // `css`-prop wrappers). Disambiguate by JSX source location.
          const inspectionLog: Array<{
            id: number;
            payloadType?: string;
            source: InspectedElementSource | null;
            matched: boolean;
          }> = [];
          for (const candidateID of candidates) {
            let payload: InspectedElementPayload | null | undefined;
            try {
              payload = inspect(generateRequestID(), candidateID, null, true);
            } catch {
              inspectionLog.push({ id: candidateID, source: null, matched: false });
              continue;
            }
            const candidateSource = extractSourceFromPayload(payload);
            const matched = Boolean(
              candidateSource && sourcesMatch(candidateSource, ourDebugSource)
            );
            inspectionLog.push({
              id: candidateID,
              payloadType: (payload as { type?: string } | null | undefined)?.type,
              source: candidateSource,
              matched,
            });
            if (matched) {
              targetID = candidateID;
              resolutionMethod = 'source-fn+source';
              break;
            }
          }
          // eslint-disable-next-line no-console
          console.debug('[inspect_component] inspectElement disambiguation:', {
            ourDebugSource,
            inspectionLog,
          });
        } else if (candidates.length === 1) {
          targetID = candidates[0];
          resolutionMethod = 'source-fn-unique';
        }
      }
      if (targetID == null && targetComponentName) {
        const match = chain.find((entry) => ownerEntryMatchesName(entry, targetComponentName));
        if (match) {
          targetID = match.id;
          resolutionMethod = 'name';
        }
      }

      // eslint-disable-next-line no-console
      console.debug('[inspect_component] owner-chain resolution:', {
        rendererID,
        candidateTag: candidate.tagName.toLowerCase(),
        hostID,
        targetComponentName,
        ourDebugSource,
        sourceFnCandidates,
        chain,
        resolvedTargetID: targetID,
        resolutionMethod,
      });

      if (targetID == null) {
        // Don't fall back to hostID — that's what produced the
        // "paddingSize on a DOM element" warning. Try the next candidate; if
        // every candidate fails to resolve a matching component, return a
        // clear reason at the end.
        sawHostIDButNoMatch = true;
        continue;
      }

      try {
        overrideFn(targetID, [propName], newValue);
        // eslint-disable-next-line no-console
        console.debug('[inspect_component] override applied:', {
          rendererID,
          targetID,
          candidateTag: candidate.tagName.toLowerCase(),
          propName,
          newValue,
        });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          reason: 'override_threw',
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  // No renderer/lookup combination yielded a usable fiber ID. Return the most
  // specific reason available based on what we saw.
  if (!anyHasGetID) {
    return { ok: false, reason: 'getfiberidfornative_missing' };
  }
  if (!anyHasOverride) {
    return { ok: false, reason: 'overrideprops_missing' };
  }
  if (sawHostIDButNoMatch) {
    const chainSummary = lastChain
      ? lastChain.map((entry) => entry.displayName ?? '?').join(' ← ')
      : '(no chain)';
    const namePart = targetComponentName ?? '(no component name on fiber)';
    return {
      ok: false,
      reason: 'component_id_not_resolved',
      detail: `target=${namePart}; chain=[${chainSummary}]`,
    };
  }

  // eslint-disable-next-line no-console
  console.debug('[inspect_component] id_lookup_failed; attempts:', lookupAttempts);
  return {
    ok: false,
    reason: 'id_lookup_failed',
    detail: lookupAttempts.join('; '),
  };
};
