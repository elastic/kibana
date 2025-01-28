/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

import { useFormWizardContext } from './form_wizard_context';

interface Props {
  id: string;
  label: string;
  children: JSX.Element;
  isRequired?: boolean;
}

export const FormWizardStep = ({ id, label, isRequired, children }: Props) => {
  const { activeStepId, addStep } = useFormWizardContext();

  useEffect(() => {
    addStep(id, label, isRequired);
  }, [id, label, isRequired, addStep]);

  return activeStepId === id ? children : null;
};
