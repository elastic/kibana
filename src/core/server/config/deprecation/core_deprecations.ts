/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigDeprecationProvider, ConfigDeprecation } from '@kbn/config';

const rewriteBasePathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.server?.basePath && !settings.server?.rewriteBasePath) {
    addDeprecation({
      message:
        'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
        'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
        'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
        'current behavior and silence this warning.',
      correctiveActions: {
        manualSteps: [
          `Set 'server.rewriteBasePath' in the config file, CLI flag, or environment variable (in Docker only).`,
          `Set to false to preserve the current behavior and silence this warning.`,
        ],
      },
    });
  }
};

const rewriteCorsSettings: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const corsSettings = settings.server?.cors;
  if (typeof corsSettings === 'boolean') {
    addDeprecation({
      message: '"server.cors" is deprecated and has been replaced by "server.cors.enabled"',
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          `Replace "server.cors: ${corsSettings}" with "server.cors.enabled: ${corsSettings}"`,
        ],
      },
    });

    return {
      set: [{ path: 'server.cors', value: { enabled: corsSettings } }],
    };
  }
};

const cspRulesDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const NONCE_STRING = `{nonce}`;
  // Policies that should include the 'self' source
  const SELF_POLICIES = Object.freeze(['script-src', 'style-src']);
  const SELF_STRING = `'self'`;

  const rules: string[] = settings.csp?.rules;
  if (rules) {
    const parsed = new Map(
      rules.map((ruleStr) => {
        const parts = ruleStr.split(/\s+/);
        return [parts[0], parts.slice(1)];
      })
    );

    return {
      set: [
        {
          path: 'csp.rules',
          value: [...parsed].map(([policy, sourceList]) => {
            if (sourceList.find((source) => source.includes(NONCE_STRING))) {
              addDeprecation({
                message: `csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in ${policy}`,
                correctiveActions: {
                  manualSteps: [`Replace {nonce} syntax with 'self' in ${policy}`],
                },
              });
              sourceList = sourceList.filter((source) => !source.includes(NONCE_STRING));

              // Add 'self' if not present
              if (!sourceList.find((source) => source.includes(SELF_STRING))) {
                sourceList.push(SELF_STRING);
              }
            }

            if (
              SELF_POLICIES.includes(policy) &&
              !sourceList.find((source) => source.includes(SELF_STRING))
            ) {
              addDeprecation({
                message: `csp.rules must contain the 'self' source. Automatically adding to ${policy}.`,
                correctiveActions: {
                  manualSteps: [`Add 'self' source to ${policy}.`],
                },
              });
              sourceList.push(SELF_STRING);
            }

            return `${policy} ${sourceList.join(' ')}`.trim();
          }),
        },
      ],
    };
  }
};

export const coreDeprecationProvider: ConfigDeprecationProvider = ({ rename, unusedFromRoot }) => [
  rewriteCorsSettings,
  rewriteBasePathDeprecation,
  cspRulesDeprecation,
];
