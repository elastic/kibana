import type { z } from '@kbn/zod/v4';
import type { AuthConfiguration, authTypeSchema, hasAuthSchema, SecretConfigurationSchema } from '../schemas/v1';
export type HasAuth = z.infer<typeof hasAuthSchema>;
export type AuthTypeName = z.infer<typeof authTypeSchema>;
export type SecretsConfigurationType = z.infer<typeof SecretConfigurationSchema>;
export type CAType = z.infer<typeof AuthConfiguration.ca>;
export type VerificationModeType = z.infer<typeof AuthConfiguration.verificationMode>;
