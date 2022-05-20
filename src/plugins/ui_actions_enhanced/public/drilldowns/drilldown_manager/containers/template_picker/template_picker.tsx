/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';
import { TemplateList } from './template_list';

export const TemplatePicker: React.FC = () => {
  const drilldowns = useDrilldownManager();

  const { templates } = drilldowns.deps;

  if (!templates || !templates.length) return null;

  return <TemplateList items={templates} />;
};
