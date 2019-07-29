import { Reference } from '../references';
import { Type, TypeOptions } from './type';
export declare type ConditionalTypeValue = string | number | boolean | object | null;
export declare class ConditionalType<A extends ConditionalTypeValue, B, C> extends Type<B | C> {
    constructor(leftOperand: Reference<A>, rightOperand: Reference<A> | A | Type<unknown>, equalType: Type<B>, notEqualType: Type<C>, options?: TypeOptions<B | C>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=conditional_type.d.ts.map