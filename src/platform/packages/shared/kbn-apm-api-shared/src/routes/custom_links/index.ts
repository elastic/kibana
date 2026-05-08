/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { customLinkTransactionRoute } from './custom_link_transaction';
import { listCustomLinksRoute } from './list_custom_links';
import { createCustomLinkRoute } from './create_custom_link';
import { updateCustomLinkRoute } from './update_custom_link';
import { deleteCustomLinkRoute } from './delete_custom_link';

export const customLinksRouteDefinitions = {
  transaction: customLinkTransactionRoute,
  list: listCustomLinksRoute,
  create: createCustomLinkRoute,
  update: updateCustomLinkRoute,
  delete: deleteCustomLinkRoute,
};

export type { CustomLinkTransactionResponse } from './custom_link_transaction';
export type { ListCustomLinksResponse } from './list_custom_links';
export type { DeleteCustomLinkResponse } from './delete_custom_link';
export { filterOptionsRt, payloadRt } from './custom_link_types';
