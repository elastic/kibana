import { z } from '@kbn/zod/v4';
import type { AuthTypeSpec } from '../connector_spec';
declare const authSchema: z.ZodObject<{
    accessKeyId: z.ZodString;
    secretAccessKey: z.ZodString;
}, z.core.$strip>;
type AuthSchemaType = z.infer<typeof authSchema>;
/**
 * AWS Credentials Authentication (SigV4)
 *
 * Adds a request interceptor that automatically signs every outgoing request
 * to *.amazonaws.com with AWS Signature V4. Non-AWS URLs pass through unsigned.
 *
 * Service and region are extracted from the URL hostname pattern:
 *   {service}.{region}.amazonaws.com
 *
 * Use for: Lambda, S3, EC2, SES, and any other AWS service.
 */
export declare const AwsCredentialsAuth: AuthTypeSpec<AuthSchemaType>;
export {};
