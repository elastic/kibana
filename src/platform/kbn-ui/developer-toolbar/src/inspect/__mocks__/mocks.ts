/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentData } from '../lib/get_inspected_element_data';
import type { InspectHostConfig } from '../types';
import { createGithubSourceLinks } from '../host/create_github_source_links';

export const mockComponentData: ComponentData = {
  fileData: {
    fileName: '/Users/dev/Desktop/kibana/src/plugins/shared/zoo/hot_spring/capybara.tsx',
    columnNumber: 19,
    lineNumber: 93,
    relativePath: 'src/plugins/shared/zoo/hot_spring/capybara.tsx',
    baseFileName: 'capybara.tsx',
    codeowners: ['@elastic/team-capybara'],
  },
  euiData: {
    componentType: 'EuiButton',
    docsLink: 'https://eui.elastic.co/docs/components/button',
    iconType: 'warning',
  },
  sourceComponent: {
    type: 'CapybaraWrapper',
    element: document.createElement('div'),
  },
};

/** Creates an {@link InspectHostConfig} with Kibana-like links and a jest-mocked resolver. */
export const createMockHost = (overrides: Partial<InspectHostConfig> = {}): InspectHostConfig => ({
  resolveFileData: jest.fn().mockResolvedValue(null),
  getSourceLinks: createGithubSourceLinks({ repo: 'elastic/kibana', branch: 'main' }),
  getCodeownerHref: (codeowner) =>
    `https://github.com/orgs/elastic/teams/${codeowner.slice('@elastic/'.length)}`,
  ...overrides,
});
