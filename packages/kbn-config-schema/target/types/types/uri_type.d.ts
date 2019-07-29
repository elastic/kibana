import { Type, TypeOptions } from './type';
export declare type URIOptions = TypeOptions<string> & {
    scheme?: string | string[];
};
export declare class URIType extends Type<string> {
    constructor(options?: URIOptions);
    protected handleError(type: string, { value, scheme }: Record<string, unknown>): string | undefined;
}
//# sourceMappingURL=uri_type.d.ts.map