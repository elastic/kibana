/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureScenario } from '../../types';

/**
 * Failure scenarios for Bank of Anthos.
 * These simulate real-world misconfigurations and failures in a banking application.
 */
export const BANK_OF_ANTHOS_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'ledger-db-disconnect',
    name: 'Ledger Database Disconnect',
    description: `Ledger services point to a wrong database URL, so all transaction operations fail.
Balance queries, transaction history, and new transactions all return errors.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'ledgerwriter',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:9999/postgresdb',
        description: 'Point ledgerwriter at dead DB port',
      },
      {
        type: 'env',
        service: 'balancereader',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:9999/postgresdb',
        description: 'Point balancereader at dead DB port',
      },
      {
        type: 'env',
        service: 'transactionhistory',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:9999/postgresdb',
        description: 'Point transactionhistory at dead DB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ledgerwriter',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        description: 'Restore ledgerwriter DB URL',
      },
      {
        type: 'env',
        service: 'balancereader',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        description: 'Restore balancereader DB URL',
      },
      {
        type: 'env',
        service: 'transactionhistory',
        variable: 'SPRING_DATASOURCE_URL',
        value: 'jdbc:postgresql://ledger-db:5432/postgresdb',
        description: 'Restore transactionhistory DB URL',
      },
    ],
  },
  {
    id: 'accounts-db-disconnect',
    name: 'Accounts Database Disconnect',
    description: `User service and contacts cannot reach the accounts database.
Login fails, user registration fails, and contacts cannot be retrieved.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'userservice',
        variable: 'ACCOUNTS_DB_URI',
        value: 'postgresql://accounts-admin:accounts-pwd@accounts-db:9999/accounts-db',
        description: 'Point userservice at dead DB port',
      },
      {
        type: 'env',
        service: 'contacts',
        variable: 'ACCOUNTS_DB_URI',
        value: 'postgresql://accounts-admin:accounts-pwd@accounts-db:9999/accounts-db',
        description: 'Point contacts at dead DB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'userservice',
        variable: 'ACCOUNTS_DB_URI',
        value: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
        description: 'Restore userservice DB URI',
      },
      {
        type: 'env',
        service: 'contacts',
        variable: 'ACCOUNTS_DB_URI',
        value: 'postgresql://accounts-admin:accounts-pwd@accounts-db:5432/accounts-db',
        description: 'Restore contacts DB URI',
      },
    ],
  },
  {
    id: 'userservice-unreachable',
    name: 'User Service Unreachable',
    description: `Frontend cannot reach the user service. Login and user operations fail,
blocking all authenticated functionality in the banking application.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'USERSERVICE_API_ADDR',
        value: 'userservice:9999',
        description: 'Point frontend to wrong userservice port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'USERSERVICE_API_ADDR',
        value: 'userservice:8080',
        description: 'Restore userservice address',
      },
    ],
  },
  {
    id: 'ledgerwriter-unreachable',
    name: 'Ledger Writer Unreachable',
    description: `Frontend cannot reach the ledger writer. All new transactions fail,
leaving customers unable to send money or make payments.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'TRANSACTIONS_API_ADDR',
        value: 'ledgerwriter:9999',
        description: 'Point frontend to wrong ledgerwriter port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'TRANSACTIONS_API_ADDR',
        value: 'ledgerwriter:8080',
        description: 'Restore ledgerwriter address',
      },
    ],
  },
  {
    id: 'balancereader-unreachable',
    name: 'Balance Reader Unreachable',
    description: `Frontend and ledgerwriter cannot reach the balance reader.
Account balances cannot be displayed, and transactions may fail validation.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'BALANCES_API_ADDR',
        value: 'balancereader:9999',
        description: 'Point frontend to wrong balancereader port',
      },
      {
        type: 'env',
        service: 'ledgerwriter',
        variable: 'BALANCES_API_ADDR',
        value: 'balancereader:9999',
        description: 'Point ledgerwriter to wrong balancereader port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'BALANCES_API_ADDR',
        value: 'balancereader:8080',
        description: 'Restore frontend balancereader address',
      },
      {
        type: 'env',
        service: 'ledgerwriter',
        variable: 'BALANCES_API_ADDR',
        value: 'balancereader:8080',
        description: 'Restore ledgerwriter balancereader address',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'load-generator-ramp',
    name: 'Load Generator Ramp',
    description: `Double the number of simulated users to 10, creating resource pressure
that raises latency and error rates without taking services down.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '10',
        description: 'Increase user count',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '5',
        description: 'Restore user count',
      },
    ],
  },
  {
    id: 'load-generator-spike',
    name: 'Load Generator Spike',
    description: `Spike user count to 25, creating significant resource pressure.
Services may become slow or intermittently unavailable under this extreme load.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '25',
        description: 'Spike user count',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'loadgenerator',
        variable: 'USERS',
        value: '5',
        description: 'Restore user count',
      },
    ],
  },
  {
    id: 'transaction-history-unavailable',
    name: 'Transaction History Unavailable',
    description: `Frontend cannot reach the transaction history service.
Users cannot view their past transactions, but can still perform new ones.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'HISTORY_API_ADDR',
        value: 'transactionhistory:9999',
        description: 'Point frontend to wrong transactionhistory port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'HISTORY_API_ADDR',
        value: 'transactionhistory:8080',
        description: 'Restore transactionhistory address',
      },
    ],
  },
  {
    id: 'contacts-unavailable',
    name: 'Contacts Service Unavailable',
    description: `Frontend cannot reach the contacts service. Users cannot view or manage
their saved contacts, but can still manually enter account numbers for transfers.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'CONTACTS_API_ADDR',
        value: 'contacts:9999',
        description: 'Point frontend to wrong contacts port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'frontend',
        variable: 'CONTACTS_API_ADDR',
        value: 'contacts:8080',
        description: 'Restore contacts address',
      },
    ],
  },
];
