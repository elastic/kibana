/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Re-export from the canonical location so that imports resolving to
 * application/hooks/use_discover_services (e.g. from discover_router or server)
 * resolve correctly. The implementation lives at public/hooks/use_discover_services.
 */
export { useDiscoverServices } from '../../hooks/use_discover_services';
