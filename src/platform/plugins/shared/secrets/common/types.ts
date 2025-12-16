/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export interface SecretAttributes {
  name: string;
  description: string;
  secret: string;
  updatedAt: string;
  createdAt: string;
}

export interface SecretDto extends SecretAttributes {
  id: string;
}

export const CreateSecretCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  secret: z.string(),
});
export type CreateSecretCommand = z.infer<typeof CreateSecretCommandSchema>;

export const UpdateSecretCommandSchema = CreateSecretCommandSchema.partial();
export type UpdateSecretCommand = z.infer<typeof UpdateSecretCommandSchema>;

export const SearchSecretsParamsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});
export type SearchSecretsParams = z.infer<typeof SearchSecretsParamsSchema>;

export interface SearchSecretsResponseDto {
  results: SecretDto[];
  page: number;
  size: number;
  total: number;
}

export interface ISecretClient {
  create(command: CreateSecretCommand): Promise<SecretDto>;
  get(name: string): Promise<SecretDto | null>;
  search(params: SearchSecretsParams): Promise<SearchSecretsResponseDto>;
  update(name: string, updates: Partial<SecretAttributes>): Promise<Partial<SecretDto>>;
  delete(name: string): Promise<void>;
}
