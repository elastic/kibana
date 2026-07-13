/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { BaseChatPromptTemplate } from '@langchain/core/prompts';
import type { PartialValues } from '@langchain/core/utils/types';

import type { KibanaFeature } from '@kbn/features-plugin/server';

interface MockIdpRolePromptInput {
  features: KibanaFeature[];
  userQuery: string;
  projectType: string | undefined;
}

export class MockIdpRolePromptTemplate extends BaseChatPromptTemplate {
  constructor() {
    super({ inputVariables: ['features', 'userQuery', 'projectType'] });
  }

  async formatMessages({
    features,
    userQuery,
    projectType,
  }: MockIdpRolePromptInput): Promise<BaseMessage[]> {
    const deploymentContext = projectType
      ? `Kibana Serverless (${projectType} project)`
      : `Kibana Stateful`;

    const featureIds = JSON.stringify(features.map((f) => f.id).concat(['base']));

    const featureList = features
      .flatMap(({ id, name, app, privileges }) => {
        if (!privileges) {
          return [];
        }

        const apps = (app as string[]).filter((a) => a !== 'kibana');
        return [
          JSON.stringify({
            id,
            name,
            supportedAccess: [
              ...(!privileges.all.disabled ? ['all'] : []),
              ...(!privileges.read?.disabled ? ['read'] : []),
            ],
            description:
              apps.length > 0 ? `Grants access to the following apps: ${apps.join(', ')}` : '',
          }),
        ];
      })
      .join(',\n');

    const systemContent = `
You are an expert in creating roles for the Elasticsearch & Kibana (${deploymentContext}).
You are given a description of the permissions that the role should grant and based on that description, you will need
to come up with the JSON description of the role STRICTLY according to the following schema (especially "enums"), and
NO other text MUST be included (no thinking, no reasoning, no explanations, no comments), just plain JSON.

## Role Schema
\`\`\`json
{
  "type": "object",
  "properties": {
    "kibana": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "properties": {
          "id": { "enum": ${featureIds} },
          "access": { "enum": ["all", "read"] },
          "space": { "type": "string" }
        },
        "required": ["id", "access", "space"]
      }
    },
    "elasticsearch": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "properties": { "index": { "type": "string" }, "access": { "enum": ["all", "read"] } },
        "required": ["index", "access"]
      }
    },
    "accessToSystemIndices": { "enum": ["all", "read", "none"] }
  },
  "required": ["kibana", "elasticsearch", "accessToSystemIndices"]
}
\`\`\`

## The "kibana" role portion

The "kibana" role portion MUST ONLY contain a list of features related to Kibana, where "id" is feature ID, and "access"
is the privilege that will be granted to specified feature. Here's the list of available features with IDs, names and
descriptions that you should use to figure out which features are assumed in the query. You MUST pick feature IDs
ONLY from this list.
\`\`\`json
[
${featureList}
]
\`\`\`

When user mentions they want to have access to all *features* (meaning all applications in Kibana), use "base" as the
feature ID (that's a special keyword). Don't make new feature IDs, if you cannot match feature the user is asking for -
ask for clarification.

The "access" property defines a level of access, it can either be "all" (manage, write, all - all are aliases for "all",
that's the highest level of access to a certain feature) or "read" (read, view - all are aliases for "read"). The "access"
should be ONLY set to a value that's supported by the specified feature as declared in "supportedAccess" feature property.
If "supportedAccess" has ONLY "all" you should use "all" for "access", if "read", you should use "read" for "access",
no matter what user requested.

Access to the feature can usually be granted within a specific "space" (should always be in lowercase and whitespaces
should be replaced with _). If the user doesn't mention a space or wants access in all spaces, you should set "space"
to "*" (a special keyword). When user mentions "default" space, use "default" as "space" value. The space is purely a
Kibana concept and is not related to Elasticsearch.

## The "elasticsearch" role portion

The "elasticsearch" portion ONLY contains a list of data indices that user should have access to, it can contain index
name or index pattern. The "access" is the privilege that will be granted to specified data index or index pattern.
When user mentions they want to have access to all indices, use "*" as the "index" (that's a special keyword). You should
use "read" access unless user explicitly mentions they want to have elevated access (full, all or write).

## The "accessToSystemIndices" role portion

The "accessToSystemIndices" property should be set to "none" by default unless user explicitly mentions that
they want to access ALL system or hidden indices without explicitly specifying their name. It can either be "all"
(manage, write, all - all are aliases for "all", that's the highest level of access to a certain feature) or "read" (
read, view - all are aliases for "read").
`;

    return [new SystemMessage(systemContent), new HumanMessage(userQuery)];
  }

  async partial(_values: PartialValues): Promise<this> {
    return this;
  }

  _getPromptType() {
    return 'mock-idp-role-prompt';
  }
}
