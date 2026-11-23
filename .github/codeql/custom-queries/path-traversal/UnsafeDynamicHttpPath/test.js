/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-unused-vars */

/* eslint-disable no-undef */

// Test cases for UnsafeDynamicHttpPath.ql
// Detects dynamic strings flowing into a browser `http.*` request path without
// buildPath()/encodeURIComponent().
//
// CodeQL Test Annotations:
// - `// $ Alert` marks the sink line (the http call) that SHOULD be reported.
// - Lines without `// $ Alert` should NOT be reported.

import { buildPath } from '@kbn/core-http-browser';
import { makeUnsafeDeletePath, makeSafeDeletePath, encodeSeg } from './__fixtures__/paths';

// =============================================================================
// BAD: inline dynamic path at the call site (also caught by the ESLint rule)
// =============================================================================

// BAD: template literal with an unencoded interpolation
http.delete(`/api/dashboards/${id}`); // $ Alert

// BAD: string concatenation
http.post('/api/dashboards/' + id); // $ Alert

// BAD: conditional whose dynamic branch is unsafe
http.options(condition ? `/api/dashboards/${id}` : '/api/dashboards/default'); // $ Alert

// BAD: object overload `{ path }`
http.fetch({ path: `/api/dashboards/${id}`, method: 'POST', body }); // $ Alert

// BAD: object overload composed with a spread. The sink is the `path` property write, so the
// alert lands on the options object rather than on the fetch call.
const fetchOptions = { path: `/api/dashboards/${id}` }; // $ Alert
http.fetch({ ...fetchOptions, method: 'GET' });

// GOOD: spread composition whose path is encoded
const safeFetchOptions = { path: buildPath('/api/dashboards/{id}', { id }) };
http.fetch({ ...safeFetchOptions, method: 'GET' });

// BAD: constant prefix but unencoded dynamic suffix
http.get(`${prefix}/${id}`); // $ Alert
http.delete(INTERNAL_ROUTES.JOBS.DELETE_PREFIX + '/' + jobId); // $ Alert

// BAD: various http-like receivers
Legacy.shims.http.post('/api/dashboards/' + id); // $ Alert
getServices().http.put({ path: basePath + '/' + id }); // $ Alert

class DashboardClientBad {
  // BAD: `this.http` receiver
  remove(id) {
    return this.http.delete(`/api/dashboards/${id}`); // $ Alert
  }
}

// =============================================================================
// BAD: data-flow cases the ESLint rule CANNOT see (the reason for this query)
// =============================================================================

// BAD: path built into a local variable, then passed to http.delete
const pathViaVar = `/api/dashboards/${id}`;
http.delete(pathViaVar); // $ Alert

// BAD: path returned from a local helper function (interprocedural)
function buildDeletePath(id) {
  return `/api/dashboards/${id}`;
}
http.delete(buildDeletePath(id)); // $ Alert

// BAD: path built by a helper in ANOTHER file (cross-file)
http.delete(makeUnsafeDeletePath(id)); // $ Alert

// BAD: path accumulated with `+=` across statements
let accumulated = '/api/dashboards';
accumulated += `/${id}`;
http.delete(accumulated); // $ Alert

// BAD: `+=` with a bare dynamic value, equivalent to '/api/things/' + id
let bareAccumulated = '/api/things/';
bareAccumulated += id;
http.delete(bareAccumulated); // $ Alert

// GOOD: `+=` that only ever appends literals
let literalAccumulated = '/api/things';
literalAccumulated += '/status';
http.get(literalAccumulated);

// GOOD: `+=` with an encoded segment
let encodedAccumulated = '/api/things/';
encodedAccumulated += encodeURIComponent(id);
http.get(encodedAccumulated);

// BAD: path assembled with Array#join and a non-empty separator
const joinedPath = [INTERNAL_ROUTES.BASE, id].join('/');
http.get(joinedPath); // $ Alert

// =============================================================================
// GOOD: should NOT be reported
// =============================================================================

// GOOD: fully static path
http.delete('/api/dashboards/123');

// GOOD: buildPath() encodes the params
http.delete(buildPath('/api/dashboards/{id}', { id }));
http.get({ path: buildPath('/api/dashboards/{id}', { id }) });

// GOOD: encodeURIComponent on the dynamic segment
http.post(`/api/dashboards/${encodeURIComponent(id)}`);
http.delete('/api/dashboards/' + encodeURIComponent(id));

// GOOD: constant-only segments (ALL_CAPS refs)
http.get(`${INTERNAL_ROUTES.BASE}/status`);

// GOOD: non-http receiver is out of scope
client.delete(`/api/dashboards/${id}`);

// GOOD: safe value held in a variable (buildPath result)
const safePath = buildPath('/api/dashboards/{id}', { id });
http.delete(safePath);

// GOOD: cross-file helper that encodes before returning
http.delete(makeSafeDeletePath(id));

// GOOD: encodeURIComponent hoisted into a variable before being interpolated
const encodedId = encodeURIComponent(id);
http.get(`/api/dashboards/${encodedId}`);
http.delete('/api/dashboards/' + encodedId);

// GOOD: buildPath() result hoisted into a variable, then concatenated
const builtPath = buildPath('/api/dashboards/{id}', { id });
http.get(INTERNAL_ROUTES.BASE + builtPath);

// GOOD: the route template may itself be a constant reference or a constant-only template
http.get(INTERNAL_ROUTES.BASE + buildPath(`${INTERNAL_ROUTES.BASE}/{id}`, { id }));

// =============================================================================
// buildPath() only encodes what it substitutes for a `{param}` placeholder
// =============================================================================

// BAD: one-argument buildPath() has no placeholder to substitute into, so it returns `id` as-is
http.get(`/api/dashboards/${buildPath(id)}`); // $ Alert

// BAD: the route template itself is dynamic, so the unencoded segment survives buildPath()
const dynamicRouteTemplate = `/api/dashboards/${id}`;
http.get(INTERNAL_ROUTES.BASE + buildPath(dynamicRouteTemplate, {})); // $ Alert

// BAD: `map(buildPath)` passes each element as the template argument, which is returned unchanged
http.get([INTERNAL_ROUTES.BASE, id].map(buildPath).join('/')); // $ Alert

// =============================================================================
// The sanitizers are resolved, not matched by name
// =============================================================================

// BAD: an unrelated local helper that happens to be called buildPath is not Kibana's
const localBuildPath = (tpl, x) => `${tpl}/${x}`;
http.get(`${INTERNAL_ROUTES.BASE}${localBuildPath('/api/dashboards', id)}`); // $ Alert

// BAD: a local pass-through shadowing the global encodeURIComponent is not the builtin
function shadowedEncoder(val) {
  const encodeURIComponent = (x) => x;
  return `/api/dashboards/${encodeURIComponent(val)}`;
}
http.get(shadowedEncoder(id)); // $ Alert

// GOOD: a member callee named encodeURIComponent is still the builtin
http.get(`/api/dashboards/${window.encodeURIComponent(id)}`);

// GOOD: non-string literal segments are constants, not user input
http.get(`/api/dashboards/${1}`);
http.get('/api/dashboards/' + 1);

// GOOD: join over an encoded segment
http.get([INTERNAL_ROUTES.BASE, encodeURIComponent(id)].join('/'));

// GOOD: join over constant-only segments
http.get([INTERNAL_ROUTES.BASE, 'status'].join('/'));

// =============================================================================
// Encoding wrappers: helpers whose every return value is an encoder result
// =============================================================================

// GOOD: the real Kibana pattern - a helper that just wraps encodeURIComponent
const encodeURIComponentIfNotEmpty = (val) => encodeURIComponent(val || '');
http.get(`/api/dashboards/${encodeURIComponentIfNotEmpty(id)}`);
http.delete('/api/dashboards/' + encodeURIComponentIfNotEmpty(id));

// GOOD: wrapper result hoisted into a variable first (exercises isEncodedValue)
const wrappedId = encodeURIComponentIfNotEmpty(id);
http.get(`/api/dashboards/${wrappedId}`);

// GOOD: block-bodied wrapper with a single return
function encodeSegment(val) {
  return encodeURIComponent(val);
}
http.get(`/api/dashboards/${encodeSegment(id)}`);

// GOOD: wrapper that assigns to a local before returning (exercises getALocalSource)
function encodeSegmentViaVar(val) {
  const encoded = encodeURIComponent(val);
  return encoded;
}
http.get(`/api/dashboards/${encodeSegmentViaVar(id)}`);

// GOOD: wrapper around buildPath()
const buildDashPath = (x) => buildPath('/api/dashboards/{id}', { id: x });
http.get(`${INTERNAL_ROUTES.BASE}${buildDashPath(id)}`);

// GOOD: cross-file encoding wrapper (proves getACallee() resolves through the import)
http.get(`/api/things/${encodeSeg(id)}`);

// GOOD: a wrapper that delegates to another wrapper (chains more than one hop)
const encodeOnce = (val) => encodeURIComponent(val || '');
const encodeTwice = (val) => encodeOnce(val);
http.get(`/api/dashboards/${encodeTwice(id)}`);

// BAD: a two-hop chain whose inner helper does not encode
const encodeNeither = (val) => `${val}`;
const wrapNeither = (val) => encodeNeither(val);
http.get(`/api/dashboards/${wrapNeither(id)}`); // $ Alert

// BAD: a wrapper that only encodes on one branch is NOT a wrapper
function maybeEncode(val, shouldEncode) {
  if (shouldEncode) {
    return encodeURIComponent(val);
  }
  return val;
}
http.get(`/api/dashboards/${maybeEncode(id, true)}`); // $ Alert

// BAD: partially-encoding wrapper result hoisted into a variable
const maybeEncodedId = maybeEncode(id, true);
http.get(`/api/dashboards/${maybeEncodedId}`); // $ Alert

// BAD: an encode-sounding name is not enough - the return value must be an encoder result
const encodeNothing = (val) => `${val}`;
http.get(`/api/dashboards/${encodeNothing(id)}`); // $ Alert

// BAD: a wrapper that encodes and then appends raw input
const encodeThenAppend = (val) => encodeURIComponent(val) + suffix;
http.get(`/api/dashboards/${encodeThenAppend(id)}`); // $ Alert

// BAD: an unresolvable callee must not be assumed safe (forex, not forall)
http.get(`/api/dashboards/${unknownGlobalEncoder(id)}`); // $ Alert

// BAD: a wrapper that can fall through returns undefined, which is not encoded
function encodeIfTruthy(val) {
  if (val) {
    return encodeURIComponent(val);
  }
}
http.get(`/api/dashboards/${encodeIfTruthy(id)}`); // $ Alert

// BAD: a bare `return;` is not an encoded value either
function encodeOrNothing(val) {
  if (!val) {
    return;
  }
  return encodeURIComponent(val);
}
http.get(`/api/dashboards/${encodeOrNothing(id)}`); // $ Alert

// =============================================================================
// A value that is only sometimes encoded is not safe
// =============================================================================

// BAD: one local source is encoded, the other is not
let mixed;
if (cond) {
  mixed = encodeURIComponent(id);
} else {
  mixed = id;
}
http.get(`/api/dashboards/${mixed}`); // $ Alert

// =============================================================================
// Array spread in join()
// =============================================================================

// BAD: spreading an array that holds unencoded input
const unsafeParts = [id, 'children'];
http.get([INTERNAL_ROUTES.BASE, ...unsafeParts].join('/')); // $ Alert

// BAD: spread of an unsafe variable as the only element
http.get([...unsafeParts].join('/')); // $ Alert

// BAD: spread of a plain (non-constant) identifier
http.get([INTERNAL_ROUTES.BASE, ...segments].join('/')); // $ Alert

// GOOD: spread of a constant array
http.get([...CONSTANT_SEGMENTS].join('/'));

// GOOD: spread of a constant property chain
http.get([INTERNAL_ROUTES.BASE, ...INTERNAL_ROUTES.SUFFIXES].join('/'));

// =============================================================================
// Arrays mutated or transformed after creation, then joined
// =============================================================================

// BAD: the unsafe segment is pushed in after the literal was created
const mutParts = [INTERNAL_ROUTES.BASE];
mutParts.push(id);
http.get(mutParts.join('/')); // $ Alert

// GOOD: only encoded segments are pushed in
const safeMutParts = [INTERNAL_ROUTES.BASE];
safeMutParts.push(encodeURIComponent(id));
http.get(safeMutParts.join('/'));

// BAD: concat introduces the unsafe segment
http.get([INTERNAL_ROUTES.BASE].concat(unsafeParts).join('/')); // $ Alert

// BAD: concat introduces the unsafe segment after an element-preserving transform
http.get([INTERNAL_ROUTES.BASE].filter(Boolean).concat(id).join('/')); // $ Alert

// GOOD: the segment concatenated onto the transformed array is encoded
http.get([INTERNAL_ROUTES.BASE].filter(Boolean).concat(encodeURIComponent(id)).join('/'));

// GOOD: concat flattens one level, so a literal-only array argument adds only safe segments
http.get([INTERNAL_ROUTES.BASE].concat(['status']).join('/'));

// GOOD: concat of an array holding an encoded segment
http.get([INTERNAL_ROUTES.BASE].concat([encodeURIComponent(id)]).join('/'));

// GOOD: concat of an empty array adds nothing
http.get([INTERNAL_ROUTES.BASE].concat([]).join('/'));

// BAD: concat of an array holding a raw segment
http.get([INTERNAL_ROUTES.BASE].concat([id]).join('/')); // $ Alert

// BAD: the unsafe segment is pushed onto a transformed array
const transformedParts = [INTERNAL_ROUTES.BASE].filter(Boolean);
transformedParts.push(id);
http.get(transformedParts.join('/')); // $ Alert

// BAD: filter preserves whatever was already unsafe
http.get([INTERNAL_ROUTES.BASE, id].filter(Boolean).join('/')); // $ Alert

// BAD: map with a non-encoding callback preserves the unsafe elements
http.get([INTERNAL_ROUTES.BASE, id].map(String).join('/')); // $ Alert

// GOOD: map with encodeURIComponent encodes every element
http.get([INTERNAL_ROUTES.BASE, id].map(encodeURIComponent).join('/'));

// GOOD: map with a local encoding wrapper as the callback
const mapEncodeSeg = (val) => encodeURIComponent(val);
http.get([INTERNAL_ROUTES.BASE, id].map(mapEncodeSeg).join('/'));

// BAD: a callback that may also resolve to a pass-through encodes only on one branch
const maybeEncodeSeg = cond ? mapEncodeSeg : (val) => val;
http.get([INTERNAL_ROUTES.BASE, id].map(maybeEncodeSeg).join('/')); // $ Alert

// =============================================================================
// join() separators
// =============================================================================

// BAD: a dynamic separator lands between every pair of otherwise-safe elements
http.get([INTERNAL_ROUTES.BASE, 'status'].join(id)); // $ Alert

// GOOD: no separator argument defaults to ','
http.get([INTERNAL_ROUTES.BASE, 'status'].join());

// GOOD: separator hoisted into a variable that only ever holds a literal
const pathSeparator = '/';
http.get([INTERNAL_ROUTES.BASE, 'status'].join(pathSeparator));

// GOOD: encoded separator
http.get([INTERNAL_ROUTES.BASE, 'status'].join(encodeURIComponent(sep)));

// GOOD: splice used to remove an element does not introduce a segment
const splicedParts = [INTERNAL_ROUTES.BASE, 'status'];
splicedParts.splice(idx, 1);
http.get(splicedParts.join('/'));
