/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// getBrowserPreferredLocale was removed in favour of server-side Accept-Language
// matching via pickFromAcceptLanguage in
// src/core/packages/rendering/server-internal/src/resolve_locale.ts.
// Equivalent algorithm coverage lives in resolve_locale.test.ts (pickFromAcceptLanguage suite).
test.todo('placeholder — real coverage lives in resolve_locale.test.ts');
