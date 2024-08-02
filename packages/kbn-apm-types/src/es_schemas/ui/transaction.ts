/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TransactionRaw } from '../raw/transaction_raw';
import { Agent } from './fields/agent';

// Make `transaction.name` required instead of optional.
// `transaction.name` can be missing in Elasticsearch but the UI will only aggregate on transactions with a name,
// and thus it doesn't make sense to treat it as optional
type InnerTransaction = TransactionRaw['transaction'];
interface InnerTransactionWithName extends InnerTransaction {
  name: string;
}

export interface Transaction extends TransactionRaw {
  agent: Agent;
  transaction: InnerTransactionWithName;
}
