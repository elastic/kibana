/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/** Connector `metadata.id` to why it has no `vendor_api` folder. */
export const vendorApiExemptionsSchema = z.record(z.string().startsWith('.'), z.string().min(1));

export type VendorApiExemptions = z.infer<typeof vendorApiExemptionsSchema>;

/**
 * The exemptions added since `previous` for connectors that already existed: the list only
 * shrinks, except for new connectors, whose exemption is reviewed with them.
 */
export const findAddedExemptions = (
  previous: VendorApiExemptions,
  current: VendorApiExemptions,
  isNewConnector: (id: string) => boolean
): string[] => Object.keys(current).filter((id) => !(id in previous) && !isNewConnector(id));
