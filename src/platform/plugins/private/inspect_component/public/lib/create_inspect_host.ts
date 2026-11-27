/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { createGithubSourceLinks } from '@kbn/ui-developer-toolbar';
import type { InspectFileData, InspectHostConfig } from '@kbn/ui-developer-toolbar';

export const INSPECT_COMPONENT_ROUTE = '/internal/inspect_component/inspect';

const ELASTIC_TEAM_PREFIX = '@elastic/';

/** Response of the POST {@link INSPECT_COMPONENT_ROUTE} route. */
interface InspectComponentResponse {
  codeowners: string[];
  relativePath: string;
  baseFileName: string;
}

interface CreateInspectHostOptions {
  http: Pick<HttpStart, 'post'>;
  /** Kibana branch the GitHub links point to. */
  branch: string;
}

/** Creates the `@kbn/ui-developer-toolbar` inspect host config backed by the plugin's server route. */
export const createInspectHost = ({
  http,
  branch,
}: CreateInspectHostOptions): InspectHostConfig => ({
  resolveFileData: async (fileName: string): Promise<InspectFileData | null> => {
    try {
      const { codeowners, relativePath, baseFileName } = await http.post<InspectComponentResponse>(
        INSPECT_COMPONENT_ROUTE,
        { body: JSON.stringify({ path: fileName }) }
      );
      return { codeowners, relativePath, baseFileName };
    } catch (e) {
      return null;
    }
  },
  getSourceLinks: createGithubSourceLinks({ repo: 'elastic/kibana', branch }),
  getCodeownerHref: (codeowner: string) =>
    codeowner.startsWith(ELASTIC_TEAM_PREFIX)
      ? `https://github.com/orgs/elastic/teams/${codeowner.slice(ELASTIC_TEAM_PREFIX.length)}`
      : undefined,
});
