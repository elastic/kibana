export declare function memoize<T extends (...args: any[]) => any>(_target: Object, _key: string | symbol, descriptor?: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void;
export declare function bind<T>(_target: Object, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void;
