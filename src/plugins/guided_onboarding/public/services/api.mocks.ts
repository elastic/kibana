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

export const searchAddDataInProgressState: GuideState = {
  isActive: true,
  status: 'in_progress',
  steps: [
    {
      id: 'add_data',
      status: 'in_progress',
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
  guideId: 'search',
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
  ],
};

export const securityRulesActivesState: GuideState = {
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
  ],
};
