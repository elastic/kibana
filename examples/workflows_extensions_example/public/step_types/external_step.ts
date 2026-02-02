/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import {
  ExternalStepTypeId,
  externalStepCommonDefinition,
} from '../../common/step_types/external_step';
import type { IExampleExternalService } from '../../common/external_service/types';

export const getExternalStepDefinition = (deps: { externalService: IExampleExternalService }) =>
  createPublicStepDefinition({
    ...externalStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/globe').then(({ icon }) => ({ default: icon }))
    ),
    label: i18n.translate('workflowsExtensionsExample.externalStep.label', {
      defaultMessage: 'External Step',
    }),
    description: i18n.translate('workflowsExtensionsExample.externalStep.description', {
      defaultMessage: 'Executes an external service operation',
    }),
    documentation: {
      details: i18n.translate('workflowsExtensionsExample.externalStep.documentation.details', {
        defaultMessage: `The ${ExternalStepTypeId} step allows you to store values in the workflow context that can be referenced in later steps using template syntax like {templateSyntax}.`,
        values: { templateSyntax: '`{{ steps.stepName.output.response }}`' }, // Needs to be extracted so it is not interpreted as a variable by the i18n plugin
      }),
      examples: [
        `## Execute an external service operation
\`\`\`yaml
- name: external_step
  type: ${ExternalStepTypeId}
  with:
    input: "Hello World"
\`\`\``,

        `## Execute an external service operation with a proxy
\`\`\`yaml
- name: external_step
  type: ${ExternalStepTypeId}
  proxyId: "my-proxy"
  with:
    input: "Hello World"
\`\`\``,
      ],
    },
    editorHandlers: {
      config: {
        'proxy.id': {
          selection: {
            search: async (input, _context) => {
              const proxies = await deps.externalService.getProxies();
              const inputTrimmed = input.trim();
              return proxies
                .filter(
                  (proxy) =>
                    inputTrimmed.length === 0 ||
                    proxy.id.includes(inputTrimmed) ||
                    proxy.name.toLowerCase().includes(inputTrimmed.toLowerCase())
                )
                .map((proxy) => ({
                  value: proxy.id,
                  label: proxy.name,
                  description: 'URL: ' + proxy.url,
                }));
            },
            resolve: async (value, _context) => {
              const proxy = await deps.externalService.getProxy(value);
              if (!proxy) {
                return null;
              }
              return {
                value: proxy.id,
                label: proxy.name,
                description: 'URL: ' + proxy.url,
              };
            },
            getDetails: async (value, _context, option) => {
              if (option) {
                return {
                  message: `Proxy "${option.label}" is connected`,
                  links: [{ text: 'Manage proxies', path: 'https://example.com/proxies' }],
                };
              }
              return {
                message: `Proxy "${value}" not found. Please select an existing proxy or create a new one.`,
                links: [
                  { text: 'Create proxy', path: 'https://example.com/proxies/new' },
                  { text: 'Manage proxies', path: 'https://example.com/proxies' },
                ],
              };
            },
          },
        },
      },
    },
  });
