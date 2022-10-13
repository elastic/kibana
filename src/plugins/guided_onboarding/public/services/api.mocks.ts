/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GuideState } from '../../common/types';

export const searchAddDataActiveState: GuideState = {
  guideId: 'search',
  isActive: true,
  status: 'in_progress',
  steps: [
    {
      id: 'add_data',
      status: 'active',
    },
    {
      id: 'browse_docs',
      status: 'inactive',
    },
    {
      id: 'search_experience',
      status: 'inactive',
    },
  ],
};

export const securityAddDataInProgressState: GuideState = {
  guideId: 'security',
  status: 'in_progress',
  isActive: true,
  steps: [
    {
      id: 'add_data',
      status: 'in_progress',
    },
    {
      id: 'rules',
      status: 'inactive',
    },
    {
      id: 'alertsCases',
      status: 'inactive',
    },
  ],
};

export const securityRulesActiveState: GuideState = {
  guideId: 'security',
  isActive: true,
  status: 'in_progress',
  steps: [
    {
      id: 'add_data',
      status: 'complete',
    },
    {
      id: 'rules',
      status: 'active',
    },
    {
      id: 'alertsCases',
      status: 'inactive',
    },
  ],
};

export const noGuideActiveState: GuideState = {
  guideId: 'security',
  status: 'in_progress',
  isActive: false,
  steps: [
    {
      id: 'add_data',
      status: 'in_progress',
    },
    {
      id: 'rules',
      status: 'inactive',
    },
    {
      id: 'alertsCases',
      status: 'inactive',
    },
  ],
};
