import { Type, TypeOptions } from './type';
export declare type StringOptions = TypeOptions<string> & {
    minLength?: number;
    maxLength?: number;
    hostname?: boolean;
};
export declare class StringType extends Type<string> {
    constructor(options?: StringOptions);
    protected handleError(type: string, { limit, value }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=string_type.d.ts.map