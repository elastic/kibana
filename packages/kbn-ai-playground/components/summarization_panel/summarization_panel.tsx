/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { IncludeCitationsField } from './include_citations_field';
import { InstructionsField } from './instructions_field';
import { OpenAIKeyField } from './open_ai_key_field';
import { ChatFormFields } from '../../types';

export const SummarizationPanel: React.FC = () => {
  const { control } = useFormContext();

  return (
    <>
      <Controller
        name={ChatFormFields.openAIKey}
        control={control}
        defaultValue=""
        render={({ field }) => <OpenAIKeyField apiKey={field.value} onSave={field.onChange} />}
      />

      <Controller
        name={ChatFormFields.prompt}
        control={control}
        defaultValue=""
        render={({ field }) => <InstructionsField value={field.value} onChange={field.onChange} />}
      />

      <Controller
        name={ChatFormFields.citations}
        control={control}
        defaultValue={true}
        render={({ field }) => (
          <IncludeCitationsField checked={field.value} onChange={field.onChange} />
        )}
      />
    </>
  );
};
