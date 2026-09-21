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

// BAD: filter preserves whatever was already unsafe
http.get([INTERNAL_ROUTES.BASE, id].filter(Boolean).join('/')); // $ Alert

// BAD: map with a non-encoding callback preserves the unsafe elements
http.get([INTERNAL_ROUTES.BASE, id].map(String).join('/')); // $ Alert

// GOOD: map with encodeURIComponent encodes every element
http.get([INTERNAL_ROUTES.BASE, id].map(encodeURIComponent).join('/'));

// GOOD: splice used to remove an element does not introduce a segment
const splicedParts = [INTERNAL_ROUTES.BASE, 'status'];
splicedParts.splice(idx, 1);
http.get(splicedParts.join('/'));
