/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const installedRules = [
  {
    id: 'cdd23260-ec49-4f3e-8a47-28070b55dba4',
    notifyWhen: undefined,
    name: 'WRITEDAC Access on Active Directory Object',
    enabled: false,
    schedule: undefined,
    actions: [],
    systemActions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: {
        blob: '',
      },
    },
    params: {
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0005',
            name: 'Defense Evasion',
            reference: 'https://attack.mitre.org/tactics/TA0005/',
          },
          technique: [
            {
              id: 'T1222',
              name: 'File and Directory Permissions Modification',
              reference: 'https://attack.mitre.org/techniques/T1222/',
              subtechnique: [
                {
                  id: 'T1222.001',
                  name: 'Windows File and Directory Permissions Modification',
                  reference: 'https://attack.mitre.org/techniques/T1222/001/',
                },
              ],
            },
          ],
        },
      ],
      ruleId: 'f5861570-e39a-4b8a-9259-abd39f84cb97',
      exceptionsList: [],
      dataViewId: undefined,
    },
    snoozeSchedule: [],
  },
  {
    id: 'fa6749e0-15f9-42f1-baf1-9eb43cfe3fcf',
    notifyWhen: undefined,
    name: 'Potential WPAD Spoofing via DNS Record Creation',
    enabled: false,
    schedule: undefined,
    actions: [],
    systemActions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: {
        blob: '',
      },
    },
    params: {
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0006',
            name: 'Credential Access',
            reference: 'https://attack.mitre.org/tactics/TA0006/',
          },
          technique: [
            {
              id: 'T1557',
              name: 'Adversary-in-the-Middle',
              reference: 'https://attack.mitre.org/techniques/T1557/',
            },
          ],
        },
      ],
      ruleId: '894326d2-56c0-4342-b553-4abfaf421b5b',
      exceptionsList: [],
      dataViewId: undefined,
    },
    snoozeSchedule: [],
  },
  {
    id: '14dc5be1-6662-4ee1-8c52-d8a7e5f07f5b',
    notifyWhen: undefined,
    name: 'Scheduled Task Execution at Scale via GPO',
    enabled: false,
    schedule: undefined,
    actions: [],
    systemActions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: {
        blob: '',
      },
    },
    params: {
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0004',
            name: 'Privilege Escalation',
            reference: 'https://attack.mitre.org/tactics/TA0004/',
          },
          technique: [
            {
              id: 'T1053',
              name: 'Scheduled Task/Job',
              reference: 'https://attack.mitre.org/techniques/T1053/',
              subtechnique: [
                {
                  id: 'T1053.005',
                  name: 'Scheduled Task',
                  reference: 'https://attack.mitre.org/techniques/T1053/005/',
                },
              ],
            },
            {
              id: 'T1484',
              name: 'Domain or Tenant Policy Modification',
              reference: 'https://attack.mitre.org/techniques/T1484/',
              subtechnique: [
                {
                  id: 'T1484.001',
                  name: 'Group Policy Modification',
                  reference: 'https://attack.mitre.org/techniques/T1484/001/',
                },
              ],
            },
          ],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0008',
            name: 'Lateral Movement',
            reference: 'https://attack.mitre.org/tactics/TA0008/',
          },
          technique: [
            {
              id: 'T1570',
              name: 'Lateral Tool Transfer',
              reference: 'https://attack.mitre.org/techniques/T1570/',
            },
          ],
        },
      ],
      ruleId: '15a8ba77-1c13-4274-88fe-6bd14133861e',
      exceptionsList: [],
      dataViewId: undefined,
    },
    snoozeSchedule: [],
  },
  {
    id: '236ea6b0-ffd9-4060-86f1-54d943a1ff18',
    notifyWhen: undefined,
    name: 'Potential Kerberos Relay Attack against a Computer Account',
    enabled: false,
    schedule: undefined,
    actions: [],
    systemActions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: {
        blob: '',
      },
    },
    params: {
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0006',
            name: 'Credential Access',
            reference: 'https://attack.mitre.org/tactics/TA0006/',
          },
          technique: [
            {
              id: 'T1187',
              name: 'Forced Authentication',
              reference: 'https://attack.mitre.org/techniques/T1187/',
            },
            {
              id: 'T1557',
              name: 'Adversary-in-the-Middle',
              reference: 'https://attack.mitre.org/techniques/T1557/',
              subtechnique: [
                {
                  id: 'T1557.001',
                  name: 'LLMNR/NBT-NS Poisoning and SMB Relay',
                  reference: 'https://attack.mitre.org/techniques/T1557/001/',
                },
              ],
            },
          ],
        },
      ],
      ruleId: '2d58f67c-156e-480a-a6eb-a698fd8197ff',
      exceptionsList: [],
      dataViewId: undefined,
    },
    snoozeSchedule: [],
  },
  {
    id: '71d2df16-ae04-4d49-966b-854e47028179',
    notifyWhen: undefined,
    name: 'Access to a Sensitive LDAP Attribute',
    enabled: false,
    schedule: undefined,
    actions: [],
    systemActions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: {
        blob: '',
      },
    },
    params: {
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0006',
            name: 'Credential Access',
            reference: 'https://attack.mitre.org/tactics/TA0006/',
          },
          technique: [
            {
              id: 'T1003',
              name: 'OS Credential Dumping',
              reference: 'https://attack.mitre.org/techniques/T1003/',
            },
            {
              id: 'T1552',
              name: 'Unsecured Credentials',
              reference: 'https://attack.mitre.org/techniques/T1552/',
              subtechnique: [
                {
                  id: 'T1552.004',
                  name: 'Private Keys',
                  reference: 'https://attack.mitre.org/techniques/T1552/004/',
                },
              ],
            },
          ],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0004',
            name: 'Privilege Escalation',
            reference: 'https://attack.mitre.org/tactics/TA0004/',
          },
          technique: [
            {
              id: 'T1078',
              name: 'Valid Accounts',
              reference: 'https://attack.mitre.org/techniques/T1078/',
              subtechnique: [
                {
                  id: 'T1078.002',
                  name: 'Domain Accounts',
                  reference: 'https://attack.mitre.org/techniques/T1078/002/',
                },
              ],
            },
          ],
        },
      ],
      ruleId: '764c9fcd-4c4c-41e6-a0c7-d6c46c2eff66',
      exceptionsList: [],
      dataViewId: undefined,
    },
    snoozeSchedule: [],
  },
];
