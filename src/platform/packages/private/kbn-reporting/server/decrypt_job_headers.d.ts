import type { Logger } from '@kbn/core/server';
export declare const decryptJobHeaders: (encryptionKey: string | undefined, headers: string, logger: Logger) => Promise<Record<string, string>>;
