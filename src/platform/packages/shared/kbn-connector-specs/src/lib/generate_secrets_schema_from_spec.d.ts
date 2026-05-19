import { z } from '@kbn/zod/v4';
import type { AuthMode, ConnectorSpec } from '../connector_spec';
interface GenerateOptions {
    isPfxEnabled?: boolean;
    isEarsEnabled?: boolean;
    authMode?: AuthMode | '';
}
export declare const generateSecretsSchemaFromSpec: (authSpec: ConnectorSpec["auth"], { isPfxEnabled, isEarsEnabled, authMode }?: GenerateOptions) => z.ZodDiscriminatedUnion<[z.core.$ZodTypeDiscriminable<string>, ...z.core.$ZodTypeDiscriminable<string>[]], "authType"> | z.ZodObject<{}, z.core.$strip>;
export {};
