import type { TypeOptions } from './type';
import { Type } from './type';
export type URIOptions = TypeOptions<string> & {
    scheme?: string | string[];
};
export declare class URIType extends Type<string> {
    constructor(options?: URIOptions);
    protected handleError(type: string, { value, scheme }: Record<string, unknown>): string | undefined;
}
