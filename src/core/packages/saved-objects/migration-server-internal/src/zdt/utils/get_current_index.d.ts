import type { Aliases } from '../../model/helpers';
export declare const getCurrentIndex: ({ indices, aliases, indexPrefix, }: {
    indices: string[];
    aliases: Aliases;
    indexPrefix: string;
}) => string | undefined;
